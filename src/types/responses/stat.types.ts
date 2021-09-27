type StatResponseAttribs = {
  directory: string;
};

type StatResponseFile = {
  type: string;
  name: string;
  mtime: string;
};

type StatResponseStat = {
  attribs: StatResponseAttribs;
  file: StatResponseFile[];
};

export type StatResponse = {
  stat: StatResponseStat;
};
