type DuResponseAttribs = {
  directory: string;
};

type DuResponseDuInfo = {
  files: string;
  bytes: string;
};

type DuResponseDu = {
  attribs: DuResponseAttribs;
  "du-info": DuResponseDuInfo[];
};

export type DuResponse = {
  du: DuResponseDu;
};
