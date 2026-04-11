export interface PartyMaster1 {
  id:               string;
  name:             string;
  leader_name?:     string;
  contestant_name?: string;
  color?:           string;
  logo_url?:        string;
}
 
export interface Country {
  id:   string;
  name: string;
  isoCode: string;
  createdAt: string;
}

export interface CreatePartyPayload {
  name:             string;
  leader_name?:     string;
  contestant_name?: string;
  color?:           string;
  logo_url?:        string;
  logo_file?:       File;  // handled via FormData in the full party dialog
}


export interface PartyMaster {
  id:               string;
  name:             string;
  leader_name?:     string;
  contestant_name?: string;
  color?:           string;
  logo_url?:        string;
  countryId?:       string | null;   // ← add this
  createdBy?:       string;
  createdAt?:       string;
  // UI-only — never from API
  checked:          boolean;
  alreadyAdded:     boolean;
  logoError:        boolean;
  country:          Country | null;  // ← add this
}

export interface Country {
  id:        string;
  name:      string;
  isoCode:    string;
  createdAt: string;
}
 
export interface CountryListResponse {
  status:    boolean;
  message:   string;
  data:      Country[];
  timestamp: string;
}
 
export interface CountrySingleResponse {
  status:    boolean;
  message:   string;
  data:      Country;
  timestamp: string;
}