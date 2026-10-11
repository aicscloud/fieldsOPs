import {
  CustomerStatus,
  CustomerType,
  DocumentKind,
  DocumentStatus,
  EquipmentPlacement,
  InterventionKind,
  MembershipRole,
  Prisma,
  PrismaClient,
  TeamGroup,
  UserStatus,
  WorkOrderPriority,
  WorkOrderStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const PASSWORD = 'Demo1234!';
const DEMO_EMAIL = 'demo@fieldops.app';
const PAST_DAYS = 365;
const FUTURE_DAYS = 21;
const JOBS_PER_WEEKDAY = 4;
const LABOR_RATE = 8500;
const TRAVEL_FEE = 5000;
const TAX_RATE = 19.25;

const FIRST_NAMES = [
  'Amadou', 'Fatou', 'Jean', 'Marie', 'Paul', 'Sophie', 'Ibrahim', 'Aïcha',
  'Lucas', 'Camille', 'Yves', 'Nadia', 'Kevin', 'Clara', 'Omar', 'Léa',
  'Marc', 'Sarah', 'Daniel', 'Inès', 'Eric', 'Julie', 'Thomas', 'Nina',
  'Brice', 'Chantal', 'Serge', 'Mireille', 'Patrick', 'Esther', 'Hermann', 'Grace',
];

const LAST_NAMES = [
  'Nkono', 'Mbarga', 'Dupont', 'Martin', 'Ngono', 'Bernard', 'Fotso', 'Petit',
  'Kamga', 'Moreau', 'Essomba', 'Laurent', 'Talla', 'Simon', 'Owona', 'Michel',
  'Nguema', 'Abanda', 'Fouda', 'Biya', 'Atangana', 'Messi', 'Eto\'o', 'Milla',
];

type City = {
  city: string;
  country: string;
  lat: number;
  lng: number;
  streets: string[];
};

const CITIES: City[] = [
  {
    city: 'Douala',
    country: 'CM',
    lat: 4.0511,
    lng: 9.7679,
    streets: ['Boulevard de la Liberté', 'Rue Joss', 'Avenue de Gaulle', 'Rue Bonanjo', 'Rue Drouot'],
  },
  {
    city: 'Yaoundé',
    country: 'CM',
    lat: 3.848,
    lng: 11.5021,
    streets: ['Avenue Kennedy', 'Boulevard du 20 Mai', 'Rue de Nachtigal', 'Avenue Germaine', 'Rue Joseph Mballa'],
  },
  {
    city: 'Bafoussam',
    country: 'CM',
    lat: 5.478,
    lng: 10.417,
    streets: ['Avenue de l\'Indépendance', 'Rue du Marché', 'Boulevard du Marché A', 'Rue Tamdja'],
  },
  {
    city: 'Limbé',
    country: 'CM',
    lat: 4.0186,
    lng: 9.2063,
    streets: ['Down Beach Road', 'Church Street', 'Bota Road', 'Mile 1 Road'],
  },
  {
    city: 'Kribi',
    country: 'CM',
    lat: 2.9373,
    lng: 9.9077,
    streets: ['Route de la Plage', 'Avenue des Cocotiers', 'Rue du Port', 'Route de Lolabé'],
  },
];

type CategorySeed = {
  name: string;
  description: string;
  defaultDuration: number;
  kind: InterventionKind;
  note: string;
};

const CATEGORIES: CategorySeed[] = [
  {
    name: 'Installation climatisation',
    description: 'Pose d\'un split ou d\'une cassette, raccordement et essais.',
    defaultDuration: 180,
    kind: InterventionKind.INSTALLATION,
    note: 'Appareil posé, tirage au vide et mise en service.',
  },
  {
    name: 'Mise en service',
    description: 'Démarrage d\'un équipement neuf et formation du client.',
    defaultDuration: 150,
    kind: InterventionKind.INSTALLATION,
    note: 'Équipement identifié chez le client, essais concluants.',
  },
  {
    name: 'Installation électrique',
    description: 'Pose ou modification d\'un circuit, tableau ou éclairage.',
    defaultDuration: 180,
    kind: InterventionKind.INSTALLATION,
    note: 'Tirage de ligne et raccordement au tableau.',
  },
  {
    name: 'Câblage réseau',
    description: 'Tirage de prises RJ45 et brassage baie.',
    defaultDuration: 120,
    kind: InterventionKind.INSTALLATION,
    note: 'Prises testées, baie brassée.',
  },
  {
    name: 'Livraison de matériel',
    description: 'Apport d\'équipements sur site, sans intervention technique.',
    defaultDuration: 60,
    kind: InterventionKind.INSTALLATION,
    note: 'Matériel déposé à l\'accueil et signé.',
  },
  {
    name: 'Maintenance climatisation',
    description: 'Entretien préventif des splits et centrales de traitement d\'air.',
    defaultDuration: 90,
    kind: InterventionKind.REPAIR,
    note: 'Filtres encrassés, pressions d\'usage normales.',
  },
  {
    name: 'Réparation froid',
    description: 'Dépannage d\'un groupe froid ou d\'une chambre froide.',
    defaultDuration: 120,
    kind: InterventionKind.REPAIR,
    note: 'Fuite traitée. Appoint de fluide et contrôle des pressions.',
  },
  {
    name: 'Dépannage plomberie',
    description: 'Fuite, robinetterie ou évacuation hors service.',
    defaultDuration: 90,
    kind: InterventionKind.REPAIR,
    note: 'Fuite sous évier. Vanne d\'arrêt remplacée.',
  },
  {
    name: 'Remplacement de filtres',
    description: 'Changement des filtres de centrale ou de cassette.',
    defaultDuration: 45,
    kind: InterventionKind.REPAIR,
    note: 'Filtres G4 et F7 remplacés sur l\'appareil en place.',
  },
  {
    name: 'Contrôle périodique',
    description: 'Visite contractuelle et relevé des anomalies.',
    defaultDuration: 60,
    kind: InterventionKind.REPAIR,
    note: 'Contrôle réalisé selon le contrat de maintenance.',
  },
  {
    name: 'Audit énergétique',
    description: 'Relevé des consommations et préconisations.',
    defaultDuration: 180,
    kind: InterventionKind.REPAIR,
    note: 'Relevés effectués sur les compteurs et les CTA.',
  },
  {
    name: 'Nettoyage technique',
    description: 'Nettoyage des condenseurs, échangeurs et gaines.',
    defaultDuration: 90,
    kind: InterventionKind.REPAIR,
    note: 'Condenseur nettoyé, débit d\'air rétabli.',
  },
  {
    name: 'Inspection sécurité',
    description: 'Vérification extincteurs, issues et alarmes.',
    defaultDuration: 60,
    kind: InterventionKind.REPAIR,
    note: 'Extincteurs en date, issues dégagées.',
  },
  {
    name: 'Dépannage urgent',
    description: 'Panne bloquante, intervention prioritaire.',
    defaultDuration: 90,
    kind: InterventionKind.REPAIR,
    note: 'Panne bloquante. Sonde remplacée, installation relancée.',
  },
  {
    name: 'Entretien groupe électrogène',
    description: 'Vidange, filtres et essai en charge.',
    defaultDuration: 120,
    kind: InterventionKind.REPAIR,
    note: 'Vidange faite, essai en charge concluant.',
  },
  {
    name: 'Maintenance cuisine professionnelle',
    description: 'Froid de cuisine, hotte et chambre positive.',
    defaultDuration: 90,
    kind: InterventionKind.REPAIR,
    note: 'Chambre positive à température, hotte propre.',
  },
  {
    name: 'Changement de climatiseur',
    description: 'Dépose de l\'appareil en place et pose d\'un équipement neuf.',
    defaultDuration: 180,
    kind: InterventionKind.REPLACEMENT,
    note: 'Ancien appareil déposé. Nouveau numéro de série enregistré.',
  },
  {
    name: 'Changement de groupe froid',
    description: 'Remplacement d\'un groupe froid par un équipement neuf.',
    defaultDuration: 240,
    kind: InterventionKind.REPLACEMENT,
    note: 'Groupe remplacé, enceinte de nouveau à température.',
  },
];

type PartSeed = {
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  min: number;
  cost: number;
  sale: number;
  serialized?: boolean;
};

const PARTS: PartSeed[] = [
  { sku: 'SPLIT-12', name: 'Climatiseur split 12 000 BTU', unit: 'pcs', quantity: 36, min: 4, cost: 185000, sale: 275000, serialized: true },
  { sku: 'SPLIT-18', name: 'Climatiseur split 18 000 BTU', unit: 'pcs', quantity: 22, min: 3, cost: 265000, sale: 385000, serialized: true },
  { sku: 'GF-POS', name: 'Groupe froid positif', unit: 'pcs', quantity: 14, min: 2, cost: 920000, sale: 1350000, serialized: true },
  { sku: 'GE-15', name: 'Groupe électrogène 15 kVA', unit: 'pcs', quantity: 6, min: 1, cost: 1500000, sale: 2100000, serialized: true },
  { sku: 'POMPE-C', name: 'Pompe de relevage', unit: 'pcs', quantity: 8, min: 2, cost: 165000, sale: 240000, serialized: true },
  { sku: 'FIL-G4', name: 'Filtre G4 climatisation', unit: 'pcs', quantity: 240, min: 40, cost: 4500, sale: 6500 },
  { sku: 'FIL-F7', name: 'Filtre poche F7', unit: 'pcs', quantity: 80, min: 20, cost: 18500, sale: 26000 },
  { sku: 'COMP-R410', name: 'Compresseur scroll R410A', unit: 'pcs', quantity: 8, min: 2, cost: 285000, sale: 390000 },
  { sku: 'GAZ-R410', name: 'Fluide R410A', unit: 'kg', quantity: 80, min: 10, cost: 12000, sale: 17500 },
  { sku: 'GAZ-R32', name: 'Fluide R32', unit: 'kg', quantity: 48, min: 8, cost: 14000, sale: 19500 },
  { sku: 'VAN-12', name: 'Vanne d\'arrêt 1/2"', unit: 'pcs', quantity: 50, min: 10, cost: 6500, sale: 9500 },
  { sku: 'ROB-MEL', name: 'Robinet mélangeur évier', unit: 'pcs', quantity: 25, min: 5, cost: 22000, sale: 32000 },
  { sku: 'JOINT-TOR', name: 'Joint torique assortiment', unit: 'boîte', quantity: 30, min: 6, cost: 3500, sale: 5000 },
  { sku: 'COUR-V', name: 'Courroie trapézoïdale', unit: 'pcs', quantity: 40, min: 8, cost: 8000, sale: 12000 },
  { sku: 'CAPT-T', name: 'Sonde de température', unit: 'pcs', quantity: 35, min: 6, cost: 15000, sale: 22000 },
  { sku: 'THERM-D', name: 'Thermostat digital', unit: 'pcs', quantity: 18, min: 4, cost: 42000, sale: 58000 },
  { sku: 'DISJ-16', name: 'Disjoncteur 16A', unit: 'pcs', quantity: 80, min: 15, cost: 5500, sale: 8000 },
  { sku: 'DISJ-32', name: 'Disjoncteur 32A', unit: 'pcs', quantity: 40, min: 8, cost: 7500, sale: 11000 },
  { sku: 'CABLE-3G', name: 'Câble 3G2.5', unit: 'm', quantity: 800, min: 50, cost: 900, sale: 1400 },
  { sku: 'RJ45-CAT6', name: 'Câble catégorie 6', unit: 'm', quantity: 600, min: 40, cost: 700, sale: 1100 },
  { sku: 'PRISE-RJ', name: 'Prise RJ45', unit: 'pcs', quantity: 120, min: 20, cost: 2500, sale: 4000 },
  { sku: 'HUILE-GE', name: 'Huile groupe électrogène', unit: 'L', quantity: 120, min: 15, cost: 3200, sale: 4500 },
  { sku: 'FIL-GO', name: 'Filtre à gasoil', unit: 'pcs', quantity: 18, min: 4, cost: 11000, sale: 15000 },
  { sku: 'COLLIER', name: 'Collier inox', unit: 'pcs', quantity: 200, min: 30, cost: 400, sale: 700 },
];

const SERIAL_SKUS = PARTS.filter((part) => part.serialized).map((part) => part.sku);
const RESERVED_FOR_REPLACEMENT: Record<string, number> = {
  'SPLIT-12': 8,
  'SPLIT-18': 6,
  'GF-POS': 6,
  'GE-15': 2,
  'POMPE-C': 2,
};

type Company = { name: string; city: string; sector: string };

function companies(): Company[] {
  const add = (prefix: string, names: string[], city: string, sector: string, into: Company[]) => {
    for (const name of names) into.push({ name: prefix ? `${prefix} ${name}` : name, city, sector });
  };
  const rows: Company[] = [];
  add('Hôtel', ['Akwa Palace', 'Sawa', 'Beauséjour', 'Le Paradis', 'Bonanjo', 'La Falaise'], 'Douala', 'Hôtellerie', rows);
  add('Hôtel', ['Mont Fébé', 'Djeuga', 'La Résidence', 'Hilton Centre'], 'Yaoundé', 'Hôtellerie', rows);
  add('Hôtel', ['Seme Beach', 'Atlantic'], 'Limbé', 'Hôtellerie', rows);
  add('Hôtel', ['Ilomba', 'Du Phare'], 'Kribi', 'Hôtellerie', rows);
  add('Hôtel', ['Le Pays', 'Tamdja'], 'Bafoussam', 'Hôtellerie', rows);
  add('Clinique', ['des Palmiers', 'La Grâce', 'Bonapriso', 'Deido', 'Saint-Luc', 'Makepe'], 'Douala', 'Santé', rows);
  add('Clinique', ['Bastos', 'Essos', 'Mvan', 'Biyem-Assi'], 'Yaoundé', 'Santé', rows);
  add('Clinique', ['du Centre', 'Djeleng'], 'Bafoussam', 'Santé', rows);
  add('Supermarché', ['Bonapriso', 'Akwa', 'Ndokotti', 'Logpom', 'Bonabéri'], 'Douala', 'Commerce', rows);
  add('Supermarché', ['Bastos', 'Mvan', 'Mokolo', 'Emana'], 'Yaoundé', 'Commerce', rows);
  add('Supermarché', ['Marché A', 'Kamkop'], 'Bafoussam', 'Commerce', rows);
  add('Supermarché', ['Down Beach'], 'Limbé', 'Commerce', rows);
  add('Usine', ['Textile du Wouri', 'Plastique Bonabéri', 'Brasserie du Littoral', 'Cacao Logbessou'], 'Douala', 'Industrie', rows);
  add('Usine', ['Agro Mvan', 'Menuiserie Odza', 'Eau minérale Nlongkak'], 'Yaoundé', 'Industrie', rows);
  add('Usine', ['Café de l\'Ouest', 'Bois Tamdja'], 'Bafoussam', 'Industrie', rows);
  add('Usine', ['Poissonnerie du Port'], 'Kribi', 'Industrie', rows);
  add('Immeuble', ['Les Cocotiers', 'Tour Bonanjo', 'Résidence Joss', 'Plateau Joss'], 'Douala', 'Bureaux', rows);
  add('Immeuble', ['Ministerial', 'Bastos Offices', 'Poste Centrale', 'Nlongkak Business'], 'Yaoundé', 'Bureaux', rows);
  add('Immeuble', ['Centre-ville', 'Banengo'], 'Bafoussam', 'Bureaux', rows);
  add('École', ['Les Manguiers', 'Saint-Joseph', 'La Gaieté', 'Bonamoussadi'], 'Douala', 'Éducation', rows);
  add('École', ['Le Cercle Vert', 'Biyem-Assi', 'Ngoa-Ekelle'], 'Yaoundé', 'Éducation', rows);
  add('École', ['Du Plateau'], 'Bafoussam', 'Éducation', rows);
  add('Restaurant', ['La Mangrove', 'Le Wouri', 'Chez Wou', 'New Bell Grill'], 'Douala', 'Restauration', rows);
  add('Restaurant', ['Le Biniou', 'Chez Tante', 'Carrefour Bastos'], 'Yaoundé', 'Restauration', rows);
  add('Restaurant', ['La Terrasse', 'Marché A'], 'Bafoussam', 'Restauration', rows);
  add('Restaurant', ['Sur la Plage'], 'Kribi', 'Restauration', rows);
  add('Résidence', ['Bonapriso', 'Bonamoussadi', 'Logpom', 'Kotto'], 'Douala', 'Habitat', rows);
  add('Résidence', ['Bastos', 'Odza', 'Emana', 'Mimboman'], 'Yaoundé', 'Habitat', rows);
  add('Résidence', ['Tamdja', 'Djeleng'], 'Bafoussam', 'Habitat', rows);
  add('Centre commercial', ['Marché Central', 'Akwa Mall', 'Bonabéri Plaza'], 'Douala', 'Commerce', rows);
  add('Centre commercial', ['Mvog-Mbi', 'Mvan Plaza'], 'Yaoundé', 'Commerce', rows);
  add('Centre commercial', ['Marché B'], 'Bafoussam', 'Commerce', rows);
  add('Banque', ['du Littoral', 'Agence Akwa'], 'Douala', 'Finance', rows);
  add('Banque', ['Agence Centre', 'Bastos'], 'Yaoundé', 'Finance', rows);
  add('Garage', ['Auto Wouri', 'Moto Express'], 'Douala', 'Automobile', rows);
  return rows;
}

function cityOf(name: string) {
  const found = CITIES.find((c) => c.city === name);
  if (!found) throw new Error(`Ville inconnue: ${name}`);
  return found;
}

function slug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function pad(n: number, size = 2) {
  return String(n).padStart(size, '0');
}

function phone(i: number) {
  const n = 600000000 + i * 37;
  const s = String(n).slice(0, 9);
  return `+237 ${s.slice(0, 3)} ${s.slice(3, 5)} ${s.slice(5, 7)} ${s.slice(7, 9)}`;
}

function dayOffset(offset: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

function atHour(day: Date, hour: number) {
  const d = new Date(day);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function workingDays(from: Date, to: Date) {
  const days: Date[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function fullName(i: number) {
  return {
    firstName: FIRST_NAMES[i % FIRST_NAMES.length],
    lastName: LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length],
  };
}

async function inChunks<T, R>(
  items: T[],
  size: number,
  run: (part: T[]) => Promise<R[]>,
): Promise<R[]> {
  const all: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    all.push(...(await run(items.slice(i, i + size))));
  }
  return all;
}

async function main() {
  const companyRows = companies();
  if (companyRows.length !== 100) {
    throw new Error(`Attendu 100 entreprises, reçu ${companyRows.length}`);
  }

  console.log('Nettoyage de la démo précédente…');
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const oldOrgs = await prisma.organization.findMany({
    where: { name: { in: ['FieldOps Demo', 'Climafrique'] } },
    select: { id: true },
  });
  for (const old of oldOrgs) {
    await prisma.equipmentRepairPart.deleteMany({
      where: { repair: { organizationId: old.id } },
    });
    await prisma.equipmentRepair.deleteMany({ where: { organizationId: old.id } });
    await prisma.installedEquipment.deleteMany({ where: { organizationId: old.id } });
    await prisma.workOrderNotePart.deleteMany({
      where: { note: { organizationId: old.id } },
    });
    await prisma.workOrderPart.deleteMany({ where: { organizationId: old.id } });
    await prisma.organization.delete({ where: { id: old.id } });
  }
  await prisma.user.deleteMany({
    where: {
      OR: [{ email: DEMO_EMAIL }, { email: { endsWith: '@fieldops.demo' } }],
    },
  });

  console.log('Organisation, groupes et équipe…');
  const org = await prisma.organization.create({
    data: {
      name: 'Climafrique',
      email: 'contact@climafrique.cm',
      phone: '+237 233 42 10 20',
      address: '84 Boulevard de la Liberté, Bonanjo',
      city: 'Douala',
      country: 'CM',
      currency: 'XAF',
      timezone: 'Africa/Douala',
      language: 'fr',
      laborHourlyRate: LABOR_RATE,
      defaultTaxRate: TAX_RATE,
    },
  });

  const groupDefs: { name: string; city: string; team: TeamGroup; size: number }[] = [
    { name: 'Techniciens Douala', city: 'Douala', team: TeamGroup.FIELD, size: 8 },
    { name: 'Techniciens Yaoundé', city: 'Yaoundé', team: TeamGroup.FIELD, size: 6 },
    { name: 'Techniciens Ouest', city: 'Bafoussam', team: TeamGroup.FIELD, size: 4 },
    { name: 'Froid industriel', city: 'Douala', team: TeamGroup.FIELD, size: 4 },
    { name: 'Transport Douala', city: 'Douala', team: TeamGroup.TRANSPORT, size: 4 },
    { name: 'Transport Yaoundé', city: 'Yaoundé', team: TeamGroup.TRANSPORT, size: 3 },
  ];
  const groups = await prisma.group.createManyAndReturn({
    data: groupDefs.map((g) => ({ organizationId: org.id, name: g.name })),
  });
  const groupByName = new Map(groups.map((g) => [g.name, g]));

  const ownerName = fullName(0);
  const owner = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      passwordHash,
      firstName: ownerName.firstName,
      lastName: ownerName.lastName,
      phone: phone(1),
      status: UserStatus.ACTIVE,
      memberships: {
        create: { organizationId: org.id, role: MembershipRole.OWNER, team: TeamGroup.FIELD },
      },
    },
  });

  type Worker = { id: string; city: string; team: TeamGroup; groupId: string };
  const people: {
    email: string;
    firstName: string;
    lastName: string;
    role: MembershipRole;
    team: TeamGroup;
    groupId?: string;
    city: string;
  }[] = [];

  const dispatchers = [
    { first: 'Aïcha', last: 'Mbarga' },
    { first: 'Paul', last: 'Essomba' },
  ];
  dispatchers.forEach((person, i) => {
    people.push({
      email: `dispatch.${i + 1}@fieldops.demo`,
      firstName: person.first,
      lastName: person.last,
      role: MembershipRole.MANAGER,
      team: TeamGroup.FIELD,
      city: 'Douala',
    });
  });

  let nameIndex = 2;
  for (const def of groupDefs) {
    const group = groupByName.get(def.name);
    if (!group) throw new Error(def.name);
    for (let n = 0; n < def.size; n++) {
      const person = fullName(nameIndex++);
      people.push({
        email: `${slug(person.firstName)}.${slug(person.lastName)}.${nameIndex}@fieldops.demo`,
        firstName: person.firstName,
        lastName: person.lastName,
        role: MembershipRole.FIELD_WORKER,
        team: def.team,
        groupId: group.id,
        city: def.city,
      });
    }
  }

  const users = await prisma.user.createManyAndReturn({
    data: people.map((p) => ({
      email: p.email,
      passwordHash,
      firstName: p.firstName,
      lastName: p.lastName,
      phone: phone(nameIndex + people.indexOf(p)),
      status: UserStatus.ACTIVE,
    })),
    select: { id: true, email: true },
  });
  const userIdByEmail = new Map(users.map((u) => [u.email, u.id]));
  await prisma.membership.createMany({
    data: people.map((p) => ({
      organizationId: org.id,
      userId: userIdByEmail.get(p.email)!,
      role: p.role,
      team: p.team,
      groupId: p.groupId,
    })),
  });

  const fieldWorkers: Worker[] = [];
  const transporters: Worker[] = [];
  for (const person of people) {
    if (person.role !== MembershipRole.FIELD_WORKER || !person.groupId) continue;
    const worker = {
      id: userIdByEmail.get(person.email)!,
      city: person.city,
      team: person.team,
      groupId: person.groupId,
    };
    if (person.team === TeamGroup.TRANSPORT) transporters.push(worker);
    else fieldWorkers.push(worker);
  }

  console.log('Catégories, pièces, clients et sites…');
  const types = await prisma.workOrderType.createManyAndReturn({
    data: CATEGORIES.map((c) => ({
      organizationId: org.id,
      name: c.name,
      description: c.description,
      kind: c.kind,
      defaultDuration: c.defaultDuration,
      requiresTransport: false,
      active: true,
    })),
  });
  const typeByName = new Map(types.map((t) => [t.name, t]));

  const parts = await prisma.part.createManyAndReturn({
    data: PARTS.map((p) => ({
      organizationId: org.id,
      sku: p.sku,
      name: p.name,
      unit: p.unit,
      quantity: p.quantity,
      minQuantity: p.min,
      unitCost: p.cost,
      salePrice: p.sale,
      active: true,
    })),
    select: { id: true, sku: true, name: true, salePrice: true },
  });
  const partBySku = new Map<
    string,
    { id: string; name: string; sale: number; opening: number; serialized: boolean; qty: number }
  >();
  for (const part of parts) {
    const seed = PARTS.find((item) => item.sku === part.sku);
    if (!seed) throw new Error(`Pièce inconnue: ${part.sku}`);
    partBySku.set(part.sku, {
      id: part.id,
      name: part.name,
      sale: seed.sale,
      opening: seed.quantity,
      serialized: !!seed.serialized,
      qty: seed.quantity,
    });
  }

  const createdCustomers = await prisma.customer.createManyAndReturn({
    data: companyRows.map((company, i) => {
      const city = cityOf(company.city);
      const street = city.streets[i % city.streets.length];
      return {
        organizationId: org.id,
        type: CustomerType.COMPANY,
        name: company.name,
        email: `contact@${slug(company.name).slice(0, 40)}.cm`,
        phone: phone(1000 + i),
        address: `${12 + (i % 80)} ${street}, ${company.city}`,
        notes:
          i % 11 === 0
            ? 'Contrat de maintenance annuel. Prévenir le responsable technique avant l\'arrivée.'
            : i % 7 === 0
              ? 'Accès badge. Se présenter à l\'accueil.'
              : null,
        status: i % 29 === 0 ? CustomerStatus.INACTIVE : CustomerStatus.ACTIVE,
      };
    }),
    select: { id: true, name: true },
  });

  const siteInputs: Prisma.SiteCreateManyInput[] = [];
  createdCustomers.forEach((customer, i) => {
    const company = companyRows[i];
    const city = cityOf(company.city);
    const street = city.streets[i % city.streets.length];
    const contact = fullName(i + 5);
    siteInputs.push({
      organizationId: org.id,
      customerId: customer.id,
      name: company.sector === 'Industrie' ? 'Atelier' : 'Bâtiment principal',
      address: `${12 + (i % 80)} ${street}`,
      city: company.city,
      country: 'CM',
      latitude: city.lat + (i % 9) * 0.008,
      longitude: city.lng + (i % 7) * 0.008,
      contactName: `${contact.firstName} ${contact.lastName}`,
      contactPhone: phone(2000 + i),
      accessInstructions:
        i % 4 === 0
          ? 'Badge au poste de garde, puis bâtiment technique.'
          : i % 3 === 0
            ? 'Sonner à l\'accueil et demander le responsable maintenance.'
            : null,
    });
    if (i % 3 === 0) {
      siteInputs.push({
        organizationId: org.id,
        customerId: customer.id,
        name: 'Entrepôt',
        address: `${4 + (i % 40)} ${city.streets[(i + 1) % city.streets.length]}`,
        city: company.city,
        country: 'CM',
        latitude: city.lat + 0.02,
        longitude: city.lng - 0.015,
        contactName: `${contact.firstName} ${contact.lastName}`,
        contactPhone: phone(3000 + i),
        accessInstructions: 'Quai de livraison côté rue.',
      });
    }
  });
  const sites = await prisma.site.createManyAndReturn({
    data: siteInputs,
    select: { id: true, customerId: true, city: true },
  });
  const sitesByCustomer = new Map<string, { id: string; city: string | null }[]>();
  for (const site of sites) {
    const list = sitesByCustomer.get(site.customerId) ?? [];
    list.push(site);
    sitesByCustomer.set(site.customerId, list);
  }
  const customersByCity = new Map<string, { id: string; name: string }[]>();
  createdCustomers.forEach((customer, i) => {
    const city = companyRows[i].city;
    const list = customersByCity.get(city) ?? [];
    list.push(customer);
    customersByCity.set(city, list);
  });

  console.log('Interventions…');
  type Job = Prisma.WorkOrderCreateManyInput & {
    withTransport: boolean;
    city: string;
    category: string;
  };
  const jobs: Job[] = [];
  let seq = 1;
  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);
  const rangeStart = new Date(today0);
  rangeStart.setDate(rangeStart.getDate() - PAST_DAYS);
  const rangeEnd = new Date(today0);
  rangeEnd.setDate(rangeEnd.getDate() + FUTURE_DAYS);
  const workDays = workingDays(rangeStart, rangeEnd);
  const jobTotal = workDays.length * JOBS_PER_WEEKDAY;

  const taken = new Map<string, Array<[number, number]>>();
  function reserve(workerId: string, key: string, startMin: number, endMin: number) {
    const slots = taken.get(`${workerId}|${key}`) ?? [];
    if (slots.some(([from, to]) => startMin < to && endMin > from)) return false;
    slots.push([startMin, endMin]);
    taken.set(`${workerId}|${key}`, slots);
    return true;
  }

  for (let i = 0; i < jobTotal; i++) {
    const dayDate = workDays[Math.floor(i / JOBS_PER_WEEKDAY)];
    const category = CATEGORIES[i % CATEGORIES.length];
    const minutes = category.defaultDuration;
    const startHours = [8, 10, 13, 15].filter((h) => h * 60 + minutes <= 19 * 60);
    const hour = startHours[i % startHours.length] ?? 8;
    const dayDelta = Math.round((dayDate.getTime() - today0.getTime()) / 86_400_000);
    const slotKey = `${dayDate.getFullYear()}-${dayDate.getMonth()}-${dayDate.getDate()}`;
    const startMin = hour * 60;
    const endMin = startMin + minutes;
    let worker = fieldWorkers[i % fieldWorkers.length];
    if (!reserve(worker.id, slotKey, startMin, endMin)) {
      const free = fieldWorkers.find((candidate) => reserve(candidate.id, slotKey, startMin, endMin));
      if (free) worker = free;
    }
    const covered =
      worker.city === 'Douala'
        ? ['Douala', 'Limbé', 'Kribi']
        : [worker.city];
    const pool = covered.flatMap((city) => customersByCity.get(city) ?? []);
    const customerPool = pool.length ? pool : createdCustomers;
    const customer = customerPool[i % customerPool.length];
    const customerSites = sitesByCustomer.get(customer.id) ?? [];
    const site = customerSites[i % customerSites.length];
    const type = typeByName.get(category.name)!;
    const needsDispatch = dayDelta >= 0 && i % 17 === 0;
    const withTransport =
      !needsDispatch &&
      (category.kind === InterventionKind.REPLACEMENT
        ? i % 2 === 0
        : category.kind === InterventionKind.INSTALLATION
          ? i % 3 === 0
          : i % 8 === 0);
    const start = atHour(dayDate, hour);
    const end = new Date(start.getTime() + minutes * 60_000);
    let status: WorkOrderStatus = WorkOrderStatus.ASSIGNED;
    if (needsDispatch) status = WorkOrderStatus.SCHEDULED;
    else if (dayDelta < 0) {
      if (i % 37 === 0) status = WorkOrderStatus.CANCELLED;
      else if (i % 43 === 0) status = WorkOrderStatus.FAILED;
      else status = WorkOrderStatus.COMPLETED;
    } else if (dayDelta === 0) {
      status = [
        WorkOrderStatus.ASSIGNED,
        WorkOrderStatus.EN_ROUTE,
        WorkOrderStatus.IN_PROGRESS,
        WorkOrderStatus.PAUSED,
      ][(i + hour) % 4];
    } else if (i % 5 === 0) {
      status = WorkOrderStatus.SCHEDULED;
    }

    const priority =
      category.name === 'Dépannage urgent'
        ? WorkOrderPriority.URGENT
        : i % 11 === 0
          ? WorkOrderPriority.HIGH
          : i % 9 === 0
            ? WorkOrderPriority.LOW
            : WorkOrderPriority.NORMAL;

    jobs.push({
      organizationId: org.id,
      number: `WO-${dayDate.getFullYear()}-${pad(seq++, 5)}`,
      title: `${category.name} — ${customer.name}`,
      description: category.note,
      customerId: customer.id,
      siteId: site.id,
      typeId: type.id,
      kind: category.kind,
      priority,
      status,
      team: TeamGroup.FIELD,
      assignedToId: needsDispatch ? null : worker.id,
      scheduledStart: start,
      scheduledEnd: end,
      estimatedMinutes: minutes,
      startedAt:
        status === WorkOrderStatus.IN_PROGRESS || status === WorkOrderStatus.COMPLETED ? start : null,
      completedAt: status === WorkOrderStatus.COMPLETED ? end : null,
      withTransport,
      city: worker.city,
      category: category.name,
    });
  }

  const parents = await inChunks(jobs, 400, (part) =>
    prisma.workOrder.createManyAndReturn({
      data: part.map(({ withTransport: _w, city: _c, category: _n, ...row }) => row),
      select: { id: true, number: true, scheduledStart: true, scheduledEnd: true },
    }),
  );
  const parentByNumber = new Map(parents.map((row) => [row.number, row]));

  const busy = new Set<string>();
  const children: Prisma.WorkOrderCreateManyInput[] = [];
  for (const job of jobs) {
    if (!job.withTransport || !job.assignedToId || !job.scheduledStart || !job.scheduledEnd) continue;
    const parent = parentByNumber.get(job.number);
    if (!parent) continue;
    const start = new Date(job.scheduledStart);
    const keyHour = start.getHours();
    const dayKey = start.toISOString().slice(0, 10);
    const sameCity = transporters.filter((t) => t.city === job.city);
    const candidates = sameCity.length ? sameCity : transporters;
    const transporter = candidates.find((t) => !busy.has(`${t.id}|${dayKey}|${keyHour}`));
    if (!transporter) continue;
    busy.add(`${transporter.id}|${dayKey}|${keyHour}`);
    const childStatus =
      job.status === WorkOrderStatus.COMPLETED
        ? WorkOrderStatus.COMPLETED
        : job.status === WorkOrderStatus.CANCELLED
          ? WorkOrderStatus.CANCELLED
          : job.status === WorkOrderStatus.FAILED
            ? WorkOrderStatus.FAILED
            : job.status === WorkOrderStatus.EN_ROUTE || job.status === WorkOrderStatus.IN_PROGRESS
              ? WorkOrderStatus.EN_ROUTE
              : WorkOrderStatus.ASSIGNED;
    const childEnd = new Date(start.getTime() + 60 * 60_000);
    children.push({
      organizationId: org.id,
      number: `WO-${start.getFullYear()}-${pad(seq++, 5)}`,
      title: `Transport — ${job.title.replace(/^.*? — /, '')}`,
      description: `Livraison du matériel pour ${job.number}.`,
      customerId: job.customerId,
      siteId: job.siteId,
      typeId: job.typeId,
      kind: job.kind,
      priority: job.priority,
      status: childStatus,
      team: TeamGroup.TRANSPORT,
      parentId: parent.id,
      assignedToId: transporter.id,
      scheduledStart: start,
      scheduledEnd: childEnd,
      estimatedMinutes: 60,
      startedAt: childStatus === WorkOrderStatus.COMPLETED ? start : null,
      completedAt: childStatus === WorkOrderStatus.COMPLETED ? childEnd : null,
    });
  }

  const childRows = await inChunks(children, 400, (part) =>
    prisma.workOrder.createManyAndReturn({
      data: part,
      select: { id: true, number: true, assignedToId: true, scheduledStart: true, scheduledEnd: true, status: true },
    }),
  );

  const allJobs = [
    ...parents.map((row) => {
      const source = jobs.find((job) => job.number === row.number)!;
      return { ...row, assignedToId: source.assignedToId ?? null, status: source.status, scheduledEnd: source.scheduledEnd ?? null };
    }),
    ...childRows.map((row) => ({
      id: row.id,
      number: row.number,
      assignedToId: row.assignedToId,
      status: row.status,
      scheduledStart: row.scheduledStart,
      scheduledEnd: row.scheduledEnd,
    })),
  ];

  await inChunks(
    allJobs.map((row) => ({
      organizationId: org.id,
      workOrderId: row.id,
      actorId: owner.id,
      toStatus: row.status as WorkOrderStatus,
      note: 'Planifiée par le dispatch',
    })),
    800,
    async (part) => {
      await prisma.workOrderEvent.createMany({ data: part });
      return [];
    },
  );

  const assignments = allJobs.filter(
    (row) => row.assignedToId && row.scheduledStart && row.scheduledEnd && row.status !== WorkOrderStatus.DRAFT,
  );
  await inChunks(
    assignments.map((row) => ({
      organizationId: org.id,
      workOrderId: row.id,
      fieldWorkerId: row.assignedToId!,
      assignedById: owner.id,
    })),
    800,
    async (part) => {
      await prisma.workOrderAssignment.createMany({ data: part });
      return [];
    },
  );

  const completed = allJobs.filter((row) => row.status === WorkOrderStatus.COMPLETED);
  await inChunks(
    completed.slice(0, 800).map((row, i) => ({
      organizationId: org.id,
      workOrderId: row.id,
      signerName: `${fullName(i + 8).firstName} ${fullName(i + 8).lastName}`,
      imageUrl: 'data:image/png;base64,seed',
    })),
    400,
    async (part) => {
      await prisma.workOrderSignature.createMany({ data: part });
      return [];
    },
  );

  await prisma.workOrderCounter.upsert({
    where: { organizationId: org.id },
    create: { organizationId: org.id, lastNumber: seq - 1 },
    update: { lastNumber: seq - 1 },
  });

  console.log('Équipements, stock et factures…');
  type UseLine = {
    workOrderId: string;
    partId: string;
    sku: string;
    name: string;
    quantity: number;
    sale: number;
    serial?: string;
    reason: string;
  };
  type UnitPlan = {
    serial: string;
    sku: string;
    partId: string;
    customerId: string;
    siteId: string;
    workOrderId: string;
    installedAt: Date;
    status: EquipmentPlacement;
    removedAt: Date | null;
    notes: string;
    repairs: number;
  };
  type RepairPlan = {
    unitSerial: string;
    workOrderId: string;
    summary: string;
    spareSkus: string[];
    replacementSerial?: string;
  };
  const uses: UseLine[] = [];
  const unitsBySite = new Map<string, UnitPlan[]>();
  const repairs: RepairPlan[] = [];
  let serialSeq = 1;

  function take(sku: string, quantity: number, workOrderId: string, reason: string, keepReserve: boolean) {
    const bucket = partBySku.get(sku);
    if (!bucket || quantity <= 0) return null;
    const floor = keepReserve && bucket.serialized ? (RESERVED_FOR_REPLACEMENT[sku] ?? 0) : 0;
    if (bucket.qty - quantity < floor) return null;
    bucket.qty -= quantity;
    const line: UseLine = {
      workOrderId,
      partId: bucket.id,
      sku,
      name: bucket.name,
      quantity,
      sale: bucket.sale,
      reason,
    };
    uses.push(line);
    return line;
  }

  function takeSerial(prefer: string[], workOrderId: string, reason: string, forReplacement: boolean) {
    for (const sku of prefer) {
      const line = take(sku, 1, workOrderId, reason, !forReplacement);
      if (!line) continue;
      line.serial = `${sku}-${pad(serialSeq++, 5)}`;
      return line;
    }
    return null;
  }

  function consumeAll(
    lines: { sku: string; qty: number }[],
    workOrderId: string,
    reason: string,
  ) {
    const ready = lines.every((line) => {
      const bucket = partBySku.get(line.sku);
      if (!bucket) return false;
      const floor = bucket.serialized ? (RESERVED_FOR_REPLACEMENT[line.sku] ?? 0) : 0;
      return bucket.qty - line.qty >= floor;
    });
    if (!ready) return [];
    return lines.flatMap((line) => (take(line.sku, line.qty, workOrderId, reason, true) ? [line.sku] : []));
  }

  function spareLines(name: string, index: number) {
    switch (name) {
      case 'Installation électrique':
        return [
          { sku: 'DISJ-16', qty: 2 },
          { sku: 'CABLE-3G', qty: 12 },
        ];
      case 'Câblage réseau':
        return [
          { sku: 'PRISE-RJ', qty: 4 },
          { sku: 'RJ45-CAT6', qty: 20 },
        ];
      case 'Maintenance climatisation':
        return [{ sku: 'FIL-G4', qty: 1 }];
      case 'Réparation froid':
        return index % 5 === 0
          ? [
              { sku: 'COMP-R410', qty: 1 },
              { sku: 'GAZ-R410', qty: 1 },
            ]
          : [
              { sku: 'GAZ-R410', qty: 2 },
              { sku: 'JOINT-TOR', qty: 1 },
            ];
      case 'Dépannage plomberie':
        return index % 2 === 0
          ? [{ sku: 'VAN-12', qty: 1 }]
          : [
              { sku: 'ROB-MEL', qty: 1 },
              { sku: 'JOINT-TOR', qty: 1 },
            ];
      case 'Remplacement de filtres':
        return [
          { sku: 'FIL-G4', qty: 2 },
          { sku: 'FIL-F7', qty: 1 },
        ];
      case 'Dépannage urgent':
        return [{ sku: 'CAPT-T', qty: 1 }];
      case 'Entretien groupe électrogène':
        return [
          { sku: 'HUILE-GE', qty: 4 },
          { sku: 'FIL-GO', qty: 1 },
        ];
      case 'Maintenance cuisine professionnelle':
        return [
          { sku: 'FIL-G4', qty: 1 },
          { sku: 'GAZ-R32', qty: 1 },
        ];
      default:
        return [];
    }
  }

  const completedParents = jobs
    .filter((job) => job.status === WorkOrderStatus.COMPLETED && job.scheduledStart && job.siteId && job.customerId)
    .map((job) => {
      const id = parentByNumber.get(job.number)?.id;
      if (!id) throw new Error(`Intervention introuvable: ${job.number}`);
      return { ...job, id, when: new Date(job.scheduledStart as Date) };
    })
    .sort((a, b) => a.when.getTime() - b.when.getTime());

  const installCategories = new Set(['Installation climatisation', 'Mise en service']);
  let placed = 0;
  for (const job of completedParents) {
    if (!installCategories.has(job.category)) continue;
    const onSite = unitsBySite.get(job.siteId!) ?? [];
    if (onSite.length >= 2) continue;
    const shift = placed % SERIAL_SKUS.length;
    const line = takeSerial(
      [...SERIAL_SKUS.slice(shift), ...SERIAL_SKUS.slice(0, shift)],
      job.id,
      `Installation ${job.number}`,
      false,
    );
    if (!line?.serial) continue;
    placed += 1;
    onSite.push({
      serial: line.serial,
      sku: line.sku,
      partId: line.partId,
      customerId: job.customerId!,
      siteId: job.siteId!,
      workOrderId: job.id,
      installedAt: job.when,
      status: EquipmentPlacement.INSTALLED,
      removedAt: null,
      notes: `Posé sur ${job.number}.`,
      repairs: 0,
    });
    unitsBySite.set(job.siteId!, onSite);
  }

  function matchesUnit(category: string, unit: UnitPlan) {
    if (category === 'Entretien groupe électrogène') return unit.sku === 'GE-15';
    if (category === 'Réparation froid' || category === 'Changement de groupe froid') return unit.sku === 'GF-POS';
    if (category === 'Maintenance cuisine professionnelle') return unit.sku === 'GF-POS' || unit.sku.startsWith('SPLIT');
    if (
      category === 'Maintenance climatisation' ||
      category === 'Remplacement de filtres' ||
      category === 'Dépannage urgent' ||
      category === 'Nettoyage technique' ||
      category === 'Changement de climatiseur'
    ) {
      return unit.sku === 'SPLIT-12' || unit.sku === 'SPLIT-18';
    }
    return true;
  }

  const categoryIndex = new Map<string, number>();
  for (const job of completedParents) {
    if (job.category === 'Installation électrique' || job.category === 'Câblage réseau') {
      const index = categoryIndex.get(job.category) ?? 0;
      categoryIndex.set(job.category, index + 1);
      consumeAll(spareLines(job.category, index), job.id, `Pose ${job.number}`);
      continue;
    }
    if (job.kind === InterventionKind.REPAIR) {
      const index = categoryIndex.get(job.category) ?? 0;
      categoryIndex.set(job.category, index + 1);
      const unit =
        job.category === 'Dépannage plomberie'
          ? undefined
          : (unitsBySite.get(job.siteId!) ?? []).find(
              (item) =>
                item.status === EquipmentPlacement.INSTALLED &&
                item.installedAt.getTime() <= job.when.getTime() &&
                item.repairs < 3 &&
                matchesUnit(job.category, item),
            );
      if (job.category !== 'Dépannage plomberie' && !unit) continue;
      const spareSkus = consumeAll(spareLines(job.category, index), job.id, `Réparation ${job.number}`);
      if (!unit) continue;
      unit.repairs += 1;
      repairs.push({
        unitSerial: unit.serial,
        workOrderId: job.id,
        summary: job.description || 'Réparation effectuée.',
        spareSkus,
      });
      continue;
    }
    if (job.kind !== InterventionKind.REPLACEMENT) continue;
    const unit = (unitsBySite.get(job.siteId!) ?? []).find(
      (item) =>
        item.status === EquipmentPlacement.INSTALLED &&
        item.installedAt.getTime() < job.when.getTime() &&
        matchesUnit(job.category, item),
    );
    if (!unit) continue;
    const prefer = job.category === 'Changement de groupe froid' ? ['GF-POS', 'SPLIT-18'] : ['SPLIT-12', 'SPLIT-18'];
    const line = takeSerial(prefer, job.id, `Changement ${job.number}`, true);
    if (!line?.serial) continue;
    const gas = take('GAZ-R410', 1, job.id, `Changement ${job.number}`, true);
    unit.status = EquipmentPlacement.REMOVED;
    unit.removedAt = job.when;
    unit.notes = `${unit.notes} Remplacé sur ${job.number}.`;
    const onSite = unitsBySite.get(job.siteId!)!;
    onSite.push({
      serial: line.serial,
      sku: line.sku,
      partId: line.partId,
      customerId: job.customerId!,
      siteId: job.siteId!,
      workOrderId: job.id,
      installedAt: job.when,
      status: EquipmentPlacement.INSTALLED,
      removedAt: null,
      notes: `Posé en remplacement sur ${job.number}.`,
      repairs: 0,
    });
    repairs.push({
      unitSerial: unit.serial,
      workOrderId: job.id,
      summary: job.description || 'Appareil remplacé.',
      spareSkus: gas ? ['GAZ-R410'] : [],
      replacementSerial: line.serial,
    });
  }

  for (const bucket of partBySku.values()) {
    const left = uses.filter((line) => line.partId === bucket.id).reduce((sum, line) => sum - line.quantity, bucket.opening);
    if (left !== bucket.qty) throw new Error(`Stock incohérent pour ${bucket.name}`);
  }

  await inChunks(uses, 400, async (part) => {
    await prisma.workOrderPart.createMany({
      data: part.map((line) => ({
        organizationId: org.id,
        workOrderId: line.workOrderId,
        partId: line.partId,
        quantity: line.quantity,
      })),
    });
    return [];
  });
  const storedParts = await prisma.workOrderPart.findMany({
    where: { organizationId: org.id },
    select: { id: true, workOrderId: true, partId: true },
  });
  const partLineId = new Map(storedParts.map((line) => [`${line.workOrderId}|${line.partId}`, line.id]));
  const allUnits = [...unitsBySite.values()].flat();
  await inChunks(allUnits, 200, async (part) => {
    await prisma.installedEquipment.createMany({
      data: part.map((unit) => ({
        organizationId: org.id,
        partId: unit.partId,
        serialNumber: unit.serial,
        status: unit.status,
        customerId: unit.customerId,
        siteId: unit.siteId,
        workOrderId: unit.workOrderId,
        workOrderPartId: partLineId.get(`${unit.workOrderId}|${unit.partId}`) ?? null,
        notes: unit.notes,
        installedAt: unit.installedAt,
        removedAt: unit.removedAt,
      })),
    });
    return [];
  });
  const storedUnits = await prisma.installedEquipment.findMany({
    where: { organizationId: org.id },
    select: { id: true, serialNumber: true },
  });
  const unitId = new Map(storedUnits.map((unit) => [unit.serialNumber, unit.id]));
  const storedRepairs = await inChunks(repairs, 200, (part) =>
    prisma.equipmentRepair.createManyAndReturn({
      data: part.map((repair) => ({
        organizationId: org.id,
        installedEquipmentId: unitId.get(repair.unitSerial)!,
        workOrderId: repair.workOrderId,
        summary: repair.summary,
        replacementId: repair.replacementSerial ? unitId.get(repair.replacementSerial) : null,
      })),
      select: { id: true, workOrderId: true },
    }),
  );
  const repairIdByJob = new Map(storedRepairs.map((repair) => [repair.workOrderId, repair.id]));
  const repairParts = repairs.flatMap((repair) => {
    const repairId = repairIdByJob.get(repair.workOrderId);
    if (!repairId) return [];
    return repair.spareSkus.flatMap((sku) => {
      const partId = partBySku.get(sku)?.id;
      const workOrderPartId = partId ? partLineId.get(`${repair.workOrderId}|${partId}`) : undefined;
      return workOrderPartId ? [{ repairId, workOrderPartId }] : [];
    });
  });
  if (repairParts.length) {
    await prisma.equipmentRepairPart.createMany({ data: repairParts });
  }
  await prisma.$transaction(
    [...partBySku.values()].map((bucket) =>
      prisma.part.update({ where: { id: bucket.id }, data: { quantity: bucket.qty } }),
    ),
  );
  await inChunks(
    [
      ...[...partBySku.values()].map((bucket) => ({
        organizationId: org.id,
        partId: bucket.id,
        delta: bucket.opening,
        reason: 'Stock initial',
      })),
      ...uses.map((line) => ({
        organizationId: org.id,
        partId: line.partId,
        delta: -line.quantity,
        reason: line.reason,
      })),
    ],
    400,
    async (part) => {
      await prisma.stockMovement.createMany({ data: part });
      return [];
    },
  );

  const consumedIds = new Set(uses.map((line) => line.workOrderId));
  const invoices = [
    ...completedParents.filter((job) => consumedIds.has(job.id)).slice(0, 45),
    ...completedParents.filter((job) => !consumedIds.has(job.id)).slice(0, 15),
  ];
  const quotes = jobs
    .filter(
      (job) =>
        job.status === WorkOrderStatus.SCHEDULED &&
        job.scheduledStart &&
        new Date(job.scheduledStart).getTime() >= today0.getTime(),
    )
    .slice(0, 12)
    .map((job) => {
      const id = parentByNumber.get(job.number)?.id;
      if (!id) throw new Error(`Devis sans intervention: ${job.number}`);
      return { ...job, id, when: new Date(job.scheduledStart as Date) };
    });

  async function createDocument(
    job: (typeof invoices)[number],
    kind: DocumentKind,
    sequence: number,
  ) {
    const hours = (job.estimatedMinutes ?? 60) / 60;
    const lines: { label: string; quantity: number; unitPrice: number; sortOrder: number }[] = [
      { label: "Main d'œuvre", quantity: hours, unitPrice: LABOR_RATE, sortOrder: 0 },
    ];
    if (job.withTransport) {
      lines.push({ label: 'Déplacement', quantity: 1, unitPrice: TRAVEL_FEE, sortOrder: 1 });
    }
    if (kind === DocumentKind.INVOICE) {
      uses
        .filter((line) => line.workOrderId === job.id)
        .forEach((line, index) => {
          lines.push({
            label: line.serial ? `${line.name} (${line.sku}) · n° ${line.serial}` : `${line.name} (${line.sku})`,
            quantity: line.quantity,
            unitPrice: line.sale,
            sortOrder: 2 + index,
          });
        });
    }
    const subtotal = Math.round(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0));
    const total = Math.round(subtotal * (1 + TAX_RATE / 100));
    const issued = kind === DocumentKind.QUOTE ? today0 : job.when;
    const due = new Date(issued);
    due.setDate(due.getDate() + 15);
    const ageDays = (today0.getTime() - issued.getTime()) / 86_400_000;
    const status =
      kind === DocumentKind.QUOTE
        ? DocumentStatus.SENT
        : ageDays > 21 && sequence % 5 !== 0
          ? DocumentStatus.PAID
          : DocumentStatus.SENT;
    await prisma.billingDocument.create({
      data: {
        organizationId: org.id,
        customerId: job.customerId!,
        workOrderId: job.id,
        kind,
        number: `${kind === DocumentKind.INVOICE ? 'FAC' : 'DEV'}-${issued.getFullYear()}-${pad(sequence, 5)}`,
        status,
        title: job.title ?? (kind === DocumentKind.INVOICE ? 'Facture' : 'Devis'),
        currency: 'XAF',
        subtotal,
        taxRate: TAX_RATE,
        total,
        issuedAt: issued,
        dueAt: due,
        lines: { create: lines },
      },
    });
  }

  for (let i = 0; i < invoices.length; i++) await createDocument(invoices[i], DocumentKind.INVOICE, i + 1);
  for (let i = 0; i < quotes.length; i++) await createDocument(quotes[i], DocumentKind.QUOTE, i + 1);

  const crypto = await import('crypto');
  await prisma.portalLink.createMany({
    data: completedParents.slice(0, 20).map((row) => ({
      organizationId: org.id,
      workOrderId: row.id,
      token: crypto.randomBytes(24).toString('hex'),
      expiresAt: dayOffset(30),
    })),
  });

  const installedCount = allUnits.filter((unit) => unit.status === EquipmentPlacement.INSTALLED).length;
  const removedCount = allUnits.length - installedCount;
  console.log('—— Seed OK ——');
  console.log('Organisation : Climafrique (Douala)');
  console.log(`Login        : ${DEMO_EMAIL}`);
  console.log(`Mot de passe : ${PASSWORD}`);
  console.log(`Groupes      : ${groups.length}`);
  console.log(`Équipe       : ${people.length + 1}`);
  console.log(`Catégories   : ${types.length}`);
  console.log(`Entreprises  : ${createdCustomers.length}`);
  console.log(`Sites        : ${sites.length}`);
  console.log(`Interventions: ${allJobs.length}`);
  console.log(`  dont transport: ${childRows.length}`);
  console.log(`Équipements  : ${installedCount} en place, ${removedCount} remplacés`);
  console.log(`Réparations  : ${repairs.length}`);
  console.log(`Factures     : ${invoices.length}`);
  console.log(`Devis        : ${quotes.length}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
