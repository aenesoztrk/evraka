export class BaseDocumentReader {
  constructor() {
    if (new.target === BaseDocumentReader) throw new TypeError("BaseDocumentReader soyut bir sınıftır.");
  }

  async read(_file) {
    throw new Error("read metodu alt sınıfta uygulanmalıdır.");
  }
}
