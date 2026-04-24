export interface FileParserStrategy {
  parse(buffer: Buffer): Promise<string>;
}
