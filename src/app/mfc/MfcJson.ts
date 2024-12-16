type MfcCard = {
  UID: string;
  ATQA: string;
  SAK: string;
};

type MfcBlocks = {
  [key: string]: string;
};

type MfcSectorKey = {
  KeyA: string;
  KeyB: string;
  AccessConditions: string;
  AccessConditionsText: { [key: string]: string; UserData: string; };
};

type MfcSectorKeys = {
  [key: string]: MfcSectorKey;
};

export class MfcJson {
  Created: string = 'Credshare';
  FileType: string = 'mfc v2';
  Card?: MfcCard;
  blocks?: MfcBlocks;
  SectorKeys?: MfcSectorKeys;
}
