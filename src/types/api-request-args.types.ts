export type APIRequestArgs<A extends string> = {
  action:
    | "upload"
    | "download"
    | "du&format=xml"
    | "stat&format=xml"
    | "mkdir"
    | "rmdir"
    | "delete"
    | `${A}&format=xml`
    | `${A}&format=xml${A}`
    | "quick-delete&quick-delete=imreallyreallysure"
    | `mtime&format=xml&mtime=${A}`
    | `rename&destination=${A}`
    | `symlink&target=${A}`|string;
  method: "PUT" | "POST" | "GET" | "DELETE";
  source?: string | Buffer;
  path?: string;
  destination?: string;
  buffer?: boolean;
};
