export class ValidationRule {
  constructor(code, title) {
    if (new.target === ValidationRule) throw new TypeError("ValidationRule soyut bir sınıftır.");
    this.code = code;
    this.title = title;
  }

  result(status, message, field = undefined, details = undefined) {
    return { code: this.code, title: this.title, status, message, field, details };
  }

  validate(_context) {
    throw new Error("validate metodu alt sınıfta uygulanmalıdır.");
  }
}
