import {
  AcademicDateRule, AddressRule, ContactRule, DatasetMatchRule, EmployerApprovalRule,
  EngineerCountRule, IdentityRule, InternshipDaysRule, RequiredFieldsRule, UserMatchRule,
} from "./rules.js";

export class ValidatorEngine {
  #rules;

  constructor(rules = [
    new RequiredFieldsRule(), new IdentityRule(), new ContactRule(), new AddressRule(),
    new AcademicDateRule(), new InternshipDaysRule(), new EmployerApprovalRule(),
    new EngineerCountRule(), new UserMatchRule(), new DatasetMatchRule(),
  ]) {
    this.#rules = rules;
  }

  run(context) {
    return this.#rules.map((rule) => rule.validate(context));
  }

  isReady(results) {
    return results.every((result) => result.status !== "error");
  }
}
