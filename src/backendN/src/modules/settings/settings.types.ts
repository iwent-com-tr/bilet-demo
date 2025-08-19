export type ResolvedSetting = {
  sectionKey: string;
  itemId: string;
  itemKey: string;
  titleTR: string;
  titleEN: string;
  inputType: string;  // TOGGLE | SELECT | MULTISELECT
  options: unknown;   // JSON
  value: unknown;     // User override or default
};
