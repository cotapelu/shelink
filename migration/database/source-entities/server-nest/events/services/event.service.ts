import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Event } from "../entities/event.entity";
import { CreateEventDto } from "../dto/create-event.dto";
import { UpdateEventDto } from "../dto/update-event.dto";

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  async create(createDto: CreateEventDto): Promise<Event> {
    const event = this.eventRepository.create(createDto);
    return this.eventRepository.save(event);
  }

  async findAll(
    personId?: string,
    upcoming?: boolean,
    limit?: number,
  ): Promise<Event[]> {
    const query = this.eventRepository.createQueryBuilder("event");

    if (personId) {
      query.where("event.person_id = :personId", { personId });
    }

    if (upcoming === true) {
      query.andWhere("event.event_date >= CURRENT_DATE");
    }

    if (limit) {
      query.limit(limit);
    }

    query.orderBy("event.event_date", "ASC");
    return query.getMany();
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventRepository.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
    return event;
  }

  async update(id: string, updateDto: UpdateEventDto): Promise<Event> {
    const event = await this.findOne(id);
    Object.assign(event, updateDto);
    return this.eventRepository.save(event);
  }

  async remove(id: string): Promise<{ success: boolean }> {
    const event = await this.findOne(id);
    await this.eventRepository.remove(event);
    return { success: true };
  }

  async count(): Promise<{ total: number }> {
    const total = await this.eventRepository.count();
    return { total };
  }
}
