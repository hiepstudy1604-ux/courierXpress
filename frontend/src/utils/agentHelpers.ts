export const CITY_CODES: Record<string, string> = {
  'Hanoi': 'HN',
  'Ho Chi Minh City': 'SG',
  'Danang': 'DN',
  'Da Nang': 'DN',
  'Khanh Hoa': 'KH',
};

// District mapping (with Q prefix)
const DISTRICT_MAP: Record<string, string> = {
  'Cau Giay': 'QCG',
  'Nam Tu Liem': 'QNTL',
  'Tan Binh': 'QTB',
  'District 1': 'Q1',
  'District 3': 'Q3',
  'District 11': 'Q11',
  'Binh Thanh': 'QBT',
  'Thu Duc': 'QTP',
  'Ngu Hanh Son': 'QNHS',
  'Lien Chieu': 'QLC',
  'Nha Trang': 'QNT',
};

/**
 * Generate Branch ID: CE-[MÃ TP]-Q[QUẬN]-[TÊN]
 */
export const generateBranchId = (city: string, district: string, branchName: string): string => {
  if (!city || !district || !branchName) return '';

  const cityCode = CITY_CODES[city] || city.substring(0, 2).toUpperCase();
  
  // Clean district name and abbreviate
  const cleanDistrict = district.trim();
  let districtCode = DISTRICT_MAP[cleanDistrict] || 
    cleanDistrict.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 3);
  
  // Add "Q" prefix if not already present
  if (!districtCode.startsWith('Q')) {
    districtCode = 'Q' + districtCode;
  }

  // Clean branch name (remove special chars, take first 10 chars)
  const cleanName = branchName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .substring(0, 50);

  return `CE-${cityCode}-${districtCode}-${cleanName}`;
};

/**
 * Generate System Login ID (same as Branch ID for now)
 */
export const generateBranchLoginId = (city: string, district: string, branchName: string): string => {

  return generateBranchId(city, district, branchName);
};

export const generatePassword = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

