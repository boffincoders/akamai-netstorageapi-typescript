export type DuResponseAttribs = {
  directory: string;
};

export type DuResponseDuInfo = {
  files: string;
  bytes: string;
};

export type DuResponseDu = {
  attribs: DuResponseAttribs;
  "du-info": DuResponseDuInfo[];
};

export type DuResponse = {
  du: DuResponseDu;
};
