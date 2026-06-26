import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Relationship } from "../entities/relationship.entity";
import { CreateRelationshipDto } from "../dto/create-relationship.dto";

@Injectable()
export class RelationshipService {
  constructor(
    @InjectRepository(Relationship)
    private readonly relationshipRepository: Repository<Relationship>,
  ) {}

  async create(createDto: CreateRelationshipDto): Promise<Relationship> {
    // Check for existing relationship between these persons of same type
    const existing = await this.relationshipRepository.findOne({
      where: {
        person_a: createDto.person_a,
        person_b: createDto.person_b,
        type: createDto.type,
      },
    });
    if (existing) {
      throw new ForbiddenException(
        "Relationship already exists between these persons",
      );
    }

    const relationship = this.relationshipRepository.create(createDto);
    return this.relationshipRepository.save(relationship);
  }

  async findAllByPerson(personId: string): Promise<Relationship[]> {
    return this.relationshipRepository.find({
      where: [{ person_a: personId }, { person_b: personId }],
      relations: ["personA", "personB"],
      order: { created_at: "DESC" },
    });
  }

  async findOne(id: string): Promise<Relationship> {
    const rel = await this.relationshipRepository.findOne({
      where: { id },
      relations: ["personA", "personB"],
    });
    if (!rel) {
      throw new NotFoundException(`Relationship with ID ${id} not found`);
    }
    return rel;
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const rel = await this.findOne(id);
    await this.relationshipRepository.remove(rel);
    return { success: true };
  }

  async removeByPersons(
    personAId: string,
    personBId: string,
    type?: string,
  ): Promise<{ success: boolean }> {
    const where: any = {
      person_a: personAId,
      person_b: personBId,
    };
    if (type) {
      where.type = type;
    }
    const rel = await this.relationshipRepository.findOne({ where });
    if (rel) {
      await this.relationshipRepository.remove(rel);
    }
    return { success: true };
  }

  async count(): Promise<{ total: number }> {
    const total = await this.relationshipRepository.count();
    return { total };
  }
}
