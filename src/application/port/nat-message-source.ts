export type NatMessagePart = {
  number: string;
  location: string;
  part: number;
  validFrom: string;
  validTo: string;
  text: string;
};

export interface NatMessageSource {
  list(): Promise<NatMessagePart[]>;
}
