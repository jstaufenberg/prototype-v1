import type { PatientRecord } from '../types/mockData';

import pt01 from '../mock-data/pt-01-delayed.json';
import pt02 from '../mock-data/pt-02-at-risk.json';
import pt03 from '../mock-data/pt-03-pending.json';
import pt04 from '../mock-data/pt-04-on-track.json';
import pt05 from '../mock-data/pt-05.json';
import pt06 from '../mock-data/pt-06.json';
import pt07 from '../mock-data/pt-07.json';
import pt08 from '../mock-data/pt-08.json';
import pt09 from '../mock-data/pt-09.json';
import pt10 from '../mock-data/pt-10.json';
import pt11 from '../mock-data/pt-11.json';
import pt12 from '../mock-data/pt-12.json';
import pt13 from '../mock-data/pt-13.json';
import pt14 from '../mock-data/pt-14.json';
import pt15 from '../mock-data/pt-15.json';
import pt16 from '../mock-data/pt-16.json';
import pt17 from '../mock-data/pt-17.json';
import pt18 from '../mock-data/pt-18.json';
import pt19 from '../mock-data/pt-19.json';
import pt20 from '../mock-data/pt-20.json';
import pt21 from '../mock-data/pt-21.json';
import pt22 from '../mock-data/pt-22.json';
import pt23 from '../mock-data/pt-23.json';
import pt24 from '../mock-data/pt-24.json';
import pt25 from '../mock-data/pt-25.json';
import pt26 from '../mock-data/pt-26.json';
import pt27 from '../mock-data/pt-27.json';
import pt28 from '../mock-data/pt-28.json';
import pt29 from '../mock-data/pt-29.json';
import pt30 from '../mock-data/pt-30.json';
import pt31 from '../mock-data/pt-31.json';
import pt32 from '../mock-data/pt-32.json';
import pt33 from '../mock-data/pt-33.json';
import pt34 from '../mock-data/pt-34.json';

export const patients: PatientRecord[] = [
  pt01 as PatientRecord,
  pt02 as PatientRecord,
  pt03 as PatientRecord,
  pt04 as PatientRecord,
  pt05 as PatientRecord,
  pt06 as PatientRecord,
  pt07 as PatientRecord,
  pt08 as PatientRecord,
  pt09 as PatientRecord,
  pt10 as PatientRecord,
  pt11 as PatientRecord,
  pt12 as PatientRecord,
  pt13 as PatientRecord,
  pt14 as PatientRecord,
  pt15 as PatientRecord,
  pt16 as PatientRecord,
  pt17 as PatientRecord,
  pt18 as PatientRecord,
  pt19 as PatientRecord,
  pt20 as PatientRecord,
  pt21 as PatientRecord,
  pt22 as PatientRecord,
  pt23 as PatientRecord,
  pt24 as PatientRecord,
  pt25 as PatientRecord,
  pt26 as PatientRecord,
  pt27 as PatientRecord,
  pt28 as PatientRecord,
  pt29 as PatientRecord,
  pt30 as PatientRecord,
  pt31 as PatientRecord,
  pt32 as PatientRecord,
  pt33 as PatientRecord,
  pt34 as PatientRecord,
];

export const defaultStateByPatientId: Record<string, string> = Object.fromEntries(
  patients.map((p) => [p.meta.patient_id, 'T0'])
);
