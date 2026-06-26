import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Person } from "../entities/person.entity";
import { Relationship } from "../entities/relationship.entity";
import { CreatePersonDto } from "../dto/create-person.dto";
import { UpdatePersonDto } from "../dto/update-person.dto";

@Injectable()
export class PersonService {
  constructor(
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    @InjectRepository(Relationship)
    private readonly relationshipRepository: Repository<Relationship>,
  ) {}

  async create(createDto: CreatePersonDto): Promise<Person> {
    // Build where condition: only include non-null fields for uniqueness check
    const where: any = { full_name: createDto.full_name };
    if (createDto.birth_year !== null && createDto.birth_year !== undefined) {
      where.birth_year = createDto.birth_year;
    }

    const existing = await this.personRepository.findOne({ where });
    if (existing) {
      throw new ConflictException(
        "Person with same name and birth year already exists",
      );
    }

    const person = this.personRepository.create(createDto);
    return this.personRepository.save(person);
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
    search?: string,
    filters?: {
      gender?: string;
      generation?: number;
      minBirthYear?: number;
      maxBirthYear?: number;
      isDeceased?: boolean;
    },
  ): Promise<{
    data: Person[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query = this.personRepository.createQueryBuilder("person");

    if (search) {
      query.where("person.full_name ILIKE :search", { search: `%${search}%` });
    }

    // Add filters
    if (filters) {
      if (filters.gender) {
        query.andWhere("person.gender = :gender", { gender: filters.gender });
      }
      if (filters.generation) {
        query.andWhere("person.generation = :generation", {
          generation: filters.generation,
        });
      }
      if (filters.minBirthYear) {
        query.andWhere("person.birth_year >= :minBirthYear", {
          minBirthYear: filters.minBirthYear,
        });
      }
      if (filters.maxBirthYear) {
        query.andWhere("person.birth_year <= :maxBirthYear", {
          maxBirthYear: filters.maxBirthYear,
        });
      }
      if (filters.isDeceased !== undefined) {
        query.andWhere("person.is_deceased = :isDeceased", {
          isDeceased: filters.isDeceased,
        });
      }
    }

    query
      .orderBy("person.full_name", "ASC")
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Person> {
    const person = await this.personRepository.findOne({ where: { id } });
    if (!person) {
      throw new NotFoundException(`Person with ID ${id} not found`);
    }
    return person;
  }

  async update(id: string, updateDto: UpdatePersonDto): Promise<Person> {
    const person = await this.findOne(id);
    Object.assign(person, updateDto);
    return this.personRepository.save(person);
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const person = await this.findOne(id);
    await this.personRepository.remove(person);
    return { success: true };
  }

  async batchDelete(
    ids: string[],
  ): Promise<{ deleted: number; errors: string[] }> {
    let deleted = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        const person = await this.findOne(id);
        await this.personRepository.remove(person);
        deleted++;
      } catch (err) {
        errors.push(`Failed to delete ${id}: ${err.message}`);
      }
    }

    return { deleted, errors };
  }

  async batchUpdate(
    ids: string[],
    data: Partial<Person>,
  ): Promise<{ updated: number; errors: string[] }> {
    let updated = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        const person = await this.findOne(id);
        Object.assign(person, data);
        await this.personRepository.save(person);
        updated++;
      } catch (err) {
        errors.push(`Failed to update ${id}: ${err.message}`);
      }
    }

    return { updated, errors };
  }

  async count(): Promise<{ total: number }> {
    const total = await this.personRepository.count();
    return { total };
  }

  async getStatsByGeneration(): Promise<
    { generation: number; count: number }[]
  > {
    const sql = `
      SELECT generation, COUNT(*) as count
      FROM persons
      WHERE generation IS NOT NULL
      GROUP BY generation
      ORDER BY generation
    `;
    const result = await this.personRepository.query(sql);
    return result.map((row: any) => ({
      generation: row.generation,
      count: row.count,
    }));
  }

  async getStatsByGender(): Promise<{ gender: string; count: number }[]> {
    const sql = `
      SELECT gender, COUNT(*) as count
      FROM persons
      GROUP BY gender
      ORDER BY gender
    `;
    const result = await this.personRepository.query(sql);
    return result.map((row: any) => ({
      gender: row.gender,
      count: row.count,
    }));
  }

  async getAgeDistribution(): Promise<{ ageGroup: string; count: number }[]> {
    const sql = `
      SELECT
        CASE
          WHEN birth_year IS NULL THEN 'unknown'
          WHEN (2025 - birth_year) < 18 THEN '0-17'
          WHEN (2025 - birth_year) BETWEEN 18 AND 30 THEN '18-30'
          WHEN (2025 - birth_year) BETWEEN 31 AND 50 THEN '31-50'
          WHEN (2025 - birth_year) BETWEEN 51 AND 70 THEN '51-70'
          ELSE '71+'
        END as "age_group",
        COUNT(*) as "count"
      FROM persons
      WHERE birth_year IS NOT NULL
      GROUP BY "age_group"
      ORDER BY "age_group"
    `;
    const result = await this.personRepository.query(sql);
    return result.map((row: any) => ({
      ageGroup: row.age_group,
      count: row.count,
    }));
  }

  async exportJSON(): Promise<Person[]> {
    return this.personRepository.find({ order: { full_name: "ASC" } });
  }

  async exportCSV(): Promise<Person[]> {
    return this.personRepository.find({ order: { full_name: "ASC" } });
  }

  async import(
    personsData: Partial<Person>[],
  ): Promise<{ imported: number; errors: string[] }> {
    let imported = 0;
    const errors: string[] = [];

    for (const data of personsData) {
      try {
        // Remove undefined/null fields that would conflict
        const cleanData = { ...data };
        if (cleanData.birth_year === null || cleanData.birth_year === undefined)
          delete cleanData.birth_year;
        if (
          cleanData.birth_month === null ||
          cleanData.birth_month === undefined
        )
          delete cleanData.birth_month;
        if (cleanData.birth_day === null || cleanData.birth_day === undefined)
          delete cleanData.birth_day;
        if (cleanData.death_year === null || cleanData.death_year === undefined)
          delete cleanData.death_year;
        if (
          cleanData.death_month === null ||
          cleanData.death_month === undefined
        )
          delete cleanData.death_month;
        if (cleanData.death_day === null || cleanData.death_day === undefined)
          delete cleanData.death_day;
        if (cleanData.phone_number === null) delete cleanData.phone_number;
        if (cleanData.occupation === null) delete cleanData.occupation;
        if (cleanData.current_residence === null)
          delete cleanData.current_residence;
        if (cleanData.other_names === null) delete cleanData.other_names;
        if (cleanData.note === null) delete cleanData.note;
        if (cleanData.avatar_url === null) delete cleanData.avatar_url;

        const person = this.personRepository.create(cleanData);
        await this.personRepository.save(person);
        imported++;
      } catch (err) {
        errors.push(
          `Failed to import person ${data.full_name}: ${err.message}`,
        );
      }
    }

    return { imported, errors };
  }

  // Kinship & Lineage methods
  async getKinshipRelation(personAId: string, personBId: string): Promise<any> {
    if (personAId === personBId) {
      return { relationship: "self", path: [] };
    }

    // BFS to find shortest path
    const queue: { id: string; path: any[] }[] = [{ id: personAId, path: [] }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;

      if (visited.has(current.id)) continue;
      visited.add(current.id);

      // Check direct relationships from current person
      const relationships = await this.relationshipRepository
        .createQueryBuilder("rel")
        .leftJoinAndSelect("rel.personA", "personA")
        .leftJoinAndSelect("rel.personB", "personB")
        .where("rel.person_a = :id", { id: current.id })
        .orWhere("rel.person_b = :id", { id: current.id })
        .getMany();

      for (const rel of relationships) {
        // rel.person_a and rel.person_b are scalar columns (strings)
        const neighbor =
          rel.person_a === current.id ? rel.person_b : rel.person_a;
        const newPath = [
          ...current.path,
          {
            relationship: rel,
            direction: rel.person_a === current.id ? "out" : "in",
          },
        ];

        if (neighbor === personBId) {
          // Found target
          return {
            relationship: rel.type,
            path: newPath,
          };
        }

        if (!visited.has(neighbor)) {
          queue.push({ id: neighbor, path: newPath });
        }
      }
    }

    return { relationship: null, path: [] };
  }

  async getLineageTree(
    rootPersonId: string,
    maxDepth: number = 3,
  ): Promise<any> {
    const root = await this.personRepository.findOne({
      where: { id: rootPersonId },
    });
    if (!root) {
      throw new NotFoundException(`Person with ID ${rootPersonId} not found`);
    }

    // Recursive build
    const buildTree = async (personId: string, depth: number): Promise<any> => {
      if (depth > maxDepth) {
        return { person: { id: personId }, children: [], spouses: [] };
      }

      const person = await this.personRepository.findOne({
        where: { id: personId },
      });
      if (!person) return null;

      // Get children (relationships where person is parent)
      const childrenRels = await this.relationshipRepository
        .createQueryBuilder("rel")
        .leftJoinAndSelect("rel.personB", "child")
        .where("rel.person_a = :id", { id: personId })
        .andWhere("rel.type IN (:...types)", {
          types: ["biological_child", "adopted_child"],
        })
        .getMany();

      // Get spouses (marriage relationships)
      const spouseRels = await this.relationshipRepository
        .createQueryBuilder("rel")
        .leftJoinAndSelect("rel.personB", "spouse")
        .where("rel.person_a = :id", { id: personId })
        .andWhere("rel.type = :type", { type: "marriage" })
        .getMany();

      const children = await Promise.all(
        childrenRels.map((rel) => buildTree(rel.person_b, depth + 1)),
      );

      const spouses = spouseRels.map((rel) => ({
        person: rel.personB,
        children: [], // spouse's children could be fetched recursively but skip for simplicity
      }));

      return {
        person,
        children: children.filter((c) => c !== null),
        spouses,
      };
    };

    return buildTree(rootPersonId, 0);
  }

  async findRootPerson(): Promise<Person | null> {
    // Find all relationships that indicate parenthood
    const allRelationships = await this.relationshipRepository.find({
      relations: ["personA", "personB"],
    });

    const childIds = new Set<string>();
    for (const rel of allRelationships) {
      if (rel.type === "biological_child" || rel.type === "adopted_child") {
        childIds.add(rel.person_b);
      }
    }

    const allPersons = await this.personRepository.find();
    const roots = allPersons.filter((p) => !childIds.has(p.id));

    if (roots.length === 0) return null;
    // Return root with lowest generation if available
    const sorted = roots.sort((a, b) => {
      if (a.generation === null && b.generation === null) return 0;
      if (a.generation === null) return 1;
      if (b.generation === null) return -1;
      return a.generation - b.generation;
    });
    return sorted[0];
  }
}
