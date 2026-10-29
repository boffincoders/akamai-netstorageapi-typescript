import xml2js from "xml2js";

// Defines an own property, so keys such as "__proto__" coming from the XML stay plain data.
const setOwn = (target: any, key: string, value: any) => {
  Object.defineProperty(target, key, { value, enumerable: true, writable: true, configurable: true });
};

// Flattens xml2js output: each root element keeps its attributes as `attribs`, and every
// repeated child element becomes an array of that child's attributes.
// e.g. <stat directory="/1"><file name="a"/></stat> => { stat: { attribs: { directory: "/1" }, file: [{ name: "a" }] } }
const simplify = (results: any) => {
  const parsed: any = {};
  if (results === null || typeof results !== "object") {
    return parsed;
  }
  Object.keys(results).forEach((root) => {
    const node = results[root];
    const obj: any = {};
    if (node !== null && node !== undefined) {
      Object.keys(node).forEach((key) => {
        if (key === "$") {
          obj.attribs = node[key];
        } else if (Array.isArray(node[key])) {
          setOwn(
            obj,
            key,
            node[key].map((child) => (child === null || child === undefined ? undefined : child.$))
          );
        }
      });
    }
    setOwn(parsed, root, obj);
  });
  return parsed;
};

// The part of xml2js.Parser used here. Declared locally so the published typings do not
// need @types/xml2js, which strict projects without skipLibCheck would otherwise require.
type XmlParser = {
  parseString(xml: string, callback: (err: Error | null, result: any) => void): void;
  parseStringPromise(xml: string): Promise<any>;
};

class Parser {
  parser: XmlParser;
  xmlPayload: string;
  constructor() {
    this.parser = new xml2js.Parser();
  }

  parse = (xmlPayload, callback) => {
    this.xmlPayload = xmlPayload;
    this.parser.parseString(this.xmlPayload, (err, results) => {
      if (err) {
        return callback(null, { message: this.xmlPayload.trim() });
      }

      return callback(null, simplify(results));
    });
  };

  parseAsync = async (xmlPayload) => {
    try {
      this.xmlPayload = xmlPayload;
      let results = await this.parser.parseStringPromise(this.xmlPayload);
      return { success: true, result: simplify(results) };
    } catch (err) {
      return { success: false, result: this.xmlPayload.trim() };
    }
  };
}

export default Parser;
