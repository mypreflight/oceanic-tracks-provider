export type TrackMessage = {
  number: string;
  type: string;
  validFrom: string;
  validTo: string;
  text: string;
};

export interface TrackMessageSource {
  find(location: string, keyword: string): Promise<TrackMessage[]>;
}
