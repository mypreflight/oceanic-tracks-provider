import type { FixCandidates } from "../../domain/place-fixes";

export interface FixDirectory {
  locate(idents: string[]): Promise<FixCandidates>;
}
