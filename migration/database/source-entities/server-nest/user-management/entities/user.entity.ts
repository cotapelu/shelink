import { Entity, Column, Index } from "typeorm";
import { ObjectType, Field } from "@nestjs/graphql";
import { Exclude } from "class-transformer";
import { BaseEntityExtended } from "@database/base.entity";

export enum UserRole {
  ADMIN = "admin",
  EDITOR = "editor",
  MEMBER = "member",
}

export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

@ObjectType()
@Entity("users")
@Index(["email"], { unique: true })
export class User extends BaseEntityExtended {
  @Field()
  @Column({ type: "varchar", length: 50 })
  firstName: string;

  @Field()
  @Column({ type: "varchar", length: 50 })
  lastName: string;

  @Field()
  @Column({ type: "varchar", length: 100, unique: true })
  email: string;

  @Column({ type: "varchar", length: 255 })
  @Exclude()
  password: string;

  @Field({ nullable: true })
  @Column({ type: "varchar", length: 20, nullable: true })
  phone: string;

  @Field(() => String)
  @Column({ type: "varchar", length: 20, default: UserRole.MEMBER })
  role: UserRole;

  @Field(() => String)
  @Column({ type: "varchar", length: 20, default: UserStatus.ACTIVE })
  status: UserStatus;

  // Virtual properties
  @Field()
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
