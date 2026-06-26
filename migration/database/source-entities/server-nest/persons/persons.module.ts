import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Person } from "./entities/person.entity";
import { Relationship } from "./entities/relationship.entity";
import { PersonService } from "./services/person.service";
import { RelationshipService } from "./services/relationship.service";
import { PersonController } from "./controllers/person.controller";
import { RelationshipController } from "./controllers/relationship.controller";
import { KinshipController } from "./controllers/kinship.controller";
import { LineageController } from "./controllers/lineage.controller";
import { TestController } from "./controllers/test.controller";
import { HelloController } from "./controllers/hello.controller";
import { PersonDetailsPrivateController } from "./controllers/person-details-private.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Person, Relationship])],
  providers: [PersonService, RelationshipService],
  controllers: [
    PersonController,
    RelationshipController,
    KinshipController,
    LineageController,
    TestController,
    HelloController,
    PersonDetailsPrivateController,
  ],
  exports: [PersonService, RelationshipService],
})
export class PersonsModule {}
