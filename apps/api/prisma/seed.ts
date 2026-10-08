import {
  CustomerStatus,
  CustomerType,
  DocumentKind,
  DocumentStatus,
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
const PRIMARY_JOBS = 840;
const TARGET_JOBS = 1000;

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
  requiresTransport: boolean;
  note: string;
};

const CATEGORIES: CategorySeed[] = [
  {
    name: 'Maintenance climatisation',
    description: 'Entretien préventif des splits et centrales de traitement d\'air.',
    defaultDuration: 90,
    requiresTransport: false,
    note: 'Filtres encrassés, pressions d\'usage normales.',
  },
  {
    name: 'Réparation froid',
    description: 'Dépannage d\'un groupe froid ou d\'une chambre froide.',
    defaultDuration: 120,
    requiresTransport: true,
    note: 'Fuite suspectée. Prévoir compresseur et fluide.',
  },
  {
    name: 'Dépannage plomberie',
    description: 'Fuite, robinetterie ou évacuation hors service.',
    defaultDuration: 90,
    requiresTransport: true,
    note: 'Fuite sous évier. Vanne d\'arrêt localisée.',
  },
  {
    name: 'Installation électrique',
    description: 'Pose ou modification d\'un circuit, tableau ou éclairage.',
    defaultDuration: 180,
    requiresTransport: true,
    note: 'Tirage de ligne et raccordement au tableau.',
  },
  {
    name: 'Contrôle périodique',
    description: 'Visite contractuelle et relevé des anomalies.',
    defaultDuration: 60,
    requiresTransport: false,
    note: 'Contrôle réalisé selon le contrat de maintenance.',
  },
  {
    name: 'Mise en service',
    description: 'Démarrage d\'un équipement neuf et formation du client.',
    defaultDuration: 150,
    requiresTransport: true,
    note: 'Équipement livré, mise en service et essais.',
  },
  {
    name: 'Remplacement de filtres',
    description: 'Changement des filtres de centrale ou de cassette.',
    defaultDuration: 45,
    requiresTransport: true,
    note: 'Filtres G4 et F7 remplacés.',
  },
  {
    name: 'Livraison de matériel',
    description: 'Apport d\'équipements sur site, sans intervention technique.',
    defaultDuration: 60,
    requiresTransport: false,
    note: 'Matériel déposé à l\'accueil et signé.',
  },
  {
    name: 'Audit énergétique',
    description: 'Relevé des consommations et préconisations.',
    defaultDuration: 180,
    requiresTransport: false,
    note: 'Relevés effectués sur les compteurs et les CTA.',
  },
  {
    name: 'Câblage réseau',
    description: 'Tirage de prises RJ45 et brassage baie.',
    defaultDuration: 120,
    requiresTransport: true,
    note: 'Prises testées, baie brassée.',
  },
  {
    name: 'Nettoyage technique',
    description: 'Nettoyage des condenseurs, échangeurs et gaines.',
    defaultDuration: 90,
    requiresTransport: false,
    note: 'Condenseur nettoyé, débit d\'air rétabli.',
  },
  {
    name: 'Inspection sécurité',
    description: 'Vérification extincteurs, issues et alarmes.',
    defaultDuration: 60,
    requiresTransport: false,
    note: 'Extincteurs en date, issues dégagées.',
  },
  {
    name: 'Dépannage urgent',
    description: 'Panne bloquante, intervention prioritaire.',
    defaultDuration: 90,
    requiresTransport: true,
    note: 'Panne bloquante. Site hors service à l\'arrivée.',
  },
  {
    name: 'Entretien groupe électrogène',
    description: 'Vidange, filtres et essai en charge.',
    defaultDuration: 120,
    requiresTransport: true,
    note: 'Vidange faite, essai en charge concluant.',
  },
  {
    name: 'Maintenance cuisine professionnelle',
    description: 'Froid de cuisine, hotte et chambre positive.',
    defaultDuration: 90,
    requiresTransport: false,
    note: 'Chambre positive à température, hotte propre.',
  },
];

const PARTS: { sku: string; name: string; unit: string; quantity: number; min: number; cost: number }[] = [
  { sku: 'FIL-G4', name: 'Filtre G4 climatisation', unit: 'pcs', quantity: 240, min: 40, cost: 4500 },
  { sku: 'FIL-F7', name: 'Filtre poche F7', unit: 'pcs', quantity: 80, min: 20, cost: 18500 },
  { sku: 'COMP-R410', name: 'Compresseur scroll R410A', unit: 'pcs', quantity: 12, min: 2, cost: 285000 },
  { sku: 'GAZ-R410', name: 'Fluide R410A', unit: 'kg', quantity: 60, min: 10, cost: 12000 },
  { sku: 'GAZ-R32', name: 'Fluide R32', unit: 'kg', quantity: 40, min: 8, cost: 14000 },
  { sku: 'VAN-12', name: 'Vanne d\'arrêt 1/2"', unit: 'pcs', quantity: 50, min: 10, cost: 6500 },
  { sku: 'ROB-MEL', name: 'Robinet mélangeur évier', unit: 'pcs', quantity: 25, min: 5, cost: 22000 },
  { sku: 'JOINT-TOR', name: 'Joint torique assortiment', unit: 'boîte', quantity: 30, min: 6, cost: 3500 },
  { sku: 'COUR-V', name: 'Courroie trapézoïdale', unit: 'pcs', quantity: 40, min: 8, cost: 8000 },
  { sku: 'CAPT-T', name: 'Sonde de température', unit: 'pcs', quantity: 35, min: 6, cost: 15000 },
  { sku: 'THERM-D', name: 'Thermostat digital', unit: 'pcs', quantity: 18, min: 4, cost: 42000 },
  { sku: 'DISJ-16', name: 'Disjoncteur 16A', unit: 'pcs', quantity: 80, min: 15, cost: 5500 },
  { sku: 'DISJ-32', name: 'Disjoncteur 32A', unit: 'pcs', quantity: 40, min: 8, cost: 7500 },
  { sku: 'CABLE-3G', name: 'Câble 3G2.5', unit: 'm', quantity: 500, min: 50, cost: 900 },
  { sku: 'RJ45-CAT6', name: 'Câble catégorie 6', unit: 'm', quantity: 300, min: 40, cost: 700 },
  { sku: 'PRISE-RJ', name: 'Prise RJ45', unit: 'pcs', quantity: 100, min: 20, cost: 2500 },
  { sku: 'HUILE-GE', name: 'Huile groupe électrogène', unit: 'L', quantity: 80, min: 15, cost: 3200 },
  { sku: 'FIL-GO', name: 'Filtre à gasoil', unit: 'pcs', quantity: 20, min: 4, cost: 11000 },
  { sku: 'POMPE-C', name: 'Pompe de relevage', unit: 'pcs', quantity: 6, min: 1, cost: 165000 },
  { sku: 'COLLIER', name: 'Collier inox', unit: 'pcs', quantity: 200, min: 30, cost: 400 },
];

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
      laborHourlyRate: 8500,
      defaultTaxRate: 19.25,
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
      defaultDuration: c.defaultDuration,
      requiresTransport: c.requiresTransport,
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
      active: true,
    })),
    select: { id: true, sku: true },
  });
  await prisma.stockMovement.createMany({
    data: parts.flatMap((part, i) => [
      {
        organizationId: org.id,
        partId: part.id,
        delta: 20 + (i % 15),
        reason: 'Réception fournisseur',
      },
      {
        organizationId: org.id,
        partId: part.id,
        delta: -(1 + (i % 4)),
        reason: 'Sortie chantier',
      },
    ]),
  });

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

  console.log(`Interventions (${TARGET_JOBS})…`);
  type Job = Prisma.WorkOrderCreateManyInput & {
    requiresTransport: boolean;
    city: string;
  };
  const jobs: Job[] = [];
  const hours = [8, 11, 14];
  let seq = 1;
  const yearStart = new Date();
  yearStart.setMonth(0, 1);
  yearStart.setHours(0, 0, 0, 0);
  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);
  const spanDays = Math.max(
    1,
    Math.round((today0.getTime() - yearStart.getTime()) / 86_400_000),
  );

  for (let i = 0; i < PRIMARY_JOBS; i++) {
    const worker = fieldWorkers[i % fieldWorkers.length];
    const dayIndex = Math.min(spanDays, Math.floor((i * spanDays) / PRIMARY_JOBS));
    const day = dayIndex - spanDays;
    const hour = hours[i % 3];
    const covered =
      worker.city === 'Douala'
        ? ['Douala', 'Limbé', 'Kribi']
        : [worker.city];
    const pool = covered.flatMap((city) => customersByCity.get(city) ?? []);
    const customerPool = pool.length ? pool : createdCustomers;
    const customer = customerPool[i % customerPool.length];
    const customerSites = sitesByCustomer.get(customer.id) ?? [];
    const site = customerSites[i % customerSites.length];
    const category = CATEGORIES[i % CATEGORIES.length];
    const type = typeByName.get(category.name)!;
    const draft = i % 28 === 0;
    const start = draft ? null : atHour(dayOffset(day), hour);
    const end = start ? new Date(start.getTime() + category.defaultDuration * 60_000) : null;
    let status: WorkOrderStatus = WorkOrderStatus.ASSIGNED;
    if (draft) status = WorkOrderStatus.DRAFT;
    else if (day < -1) {
      if (i % 23 === 0) status = WorkOrderStatus.CANCELLED;
      else if (i % 29 === 0) status = WorkOrderStatus.FAILED;
      else status = WorkOrderStatus.COMPLETED;
    } else if (day <= 0) {
      status = [WorkOrderStatus.ASSIGNED, WorkOrderStatus.EN_ROUTE, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.PAUSED][
        (i + hour) % 4
      ];
    } else if (i % 6 === 0) {
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
      number: `WO-2026-${pad(seq++, 5)}`,
      title: `${category.name} — ${customer.name}`,
      description: category.note,
      customerId: customer.id,
      siteId: site.id,
      typeId: type.id,
      priority,
      status,
      team: TeamGroup.FIELD,
      assignedToId: draft ? null : worker.id,
      scheduledStart: start,
      scheduledEnd: end,
      estimatedMinutes: category.defaultDuration,
      startedAt:
        status === WorkOrderStatus.IN_PROGRESS || status === WorkOrderStatus.COMPLETED ? start : null,
      completedAt: status === WorkOrderStatus.COMPLETED ? end : null,
      requiresTransport: category.requiresTransport && !draft && !!start,
      city: worker.city,
    });
  }

  const parents = await inChunks(jobs, 400, (part) =>
    prisma.workOrder.createManyAndReturn({
      data: part.map(({ requiresTransport: _r, city: _c, ...row }) => row),
      select: { id: true, number: true, scheduledStart: true, scheduledEnd: true },
    }),
  );
  const parentByNumber = new Map(parents.map((row) => [row.number, row]));

  const busy = new Set<string>();
  const children: Prisma.WorkOrderCreateManyInput[] = [];
  for (const job of jobs) {
    if (children.length >= TARGET_JOBS - jobs.length) break;
    if (!job.requiresTransport || !job.assignedToId || !job.scheduledStart || !job.scheduledEnd) continue;
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
    children.push({
      organizationId: org.id,
      number: `WO-2026-${pad(seq++, 5)}`,
      title: `Transport — ${job.title.replace(/^.*? — /, '')}`,
      description: `Livraison du matériel pour ${job.number}.`,
      customerId: job.customerId,
      siteId: job.siteId,
      typeId: job.typeId,
      priority: job.priority,
      status: WorkOrderStatus.ASSIGNED,
      team: TeamGroup.TRANSPORT,
      parentId: parent.id,
      assignedToId: transporter.id,
      scheduledStart: start,
      scheduledEnd: new Date(start.getTime() + 60 * 60_000),
      estimatedMinutes: 60,
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

  await inChunks(
    completed.filter((_, i) => i % 2 === 0).slice(0, 600).map((row, i) => ({
      organizationId: org.id,
      workOrderId: row.id,
      partId: parts[i % parts.length].id,
      quantity: 1 + (i % 3),
    })),
    400,
    async (part) => {
      await prisma.workOrderPart.createMany({ data: part });
      return [];
    },
  );

  await prisma.workOrderCounter.upsert({
    where: { organizationId: org.id },
    create: { organizationId: org.id, lastNumber: seq - 1 },
    update: { lastNumber: seq - 1 },
  });

  console.log('Factures et liens portail…');
  const billed = completed.slice(0, 60);
  for (let i = 0; i < billed.length; i++) {
    const job = jobs.find((row) => parentByNumber.get(row.number)?.id === billed[i].id) ?? jobs[i];
    const kind = i % 3 === 0 ? DocumentKind.QUOTE : DocumentKind.INVOICE;
    const hoursBilled = (job?.estimatedMinutes ?? 90) / 60;
    const labor = Math.round(hoursBilled * 8500);
    const travel = 5000;
    const subtotal = labor + travel;
    const taxRate = 19.25;
    const total = Math.round(subtotal * (1 + taxRate / 100));
    const status =
      kind === DocumentKind.QUOTE
        ? i % 2 === 0
          ? DocumentStatus.SENT
          : DocumentStatus.ACCEPTED
        : i % 4 === 0
          ? DocumentStatus.SENT
          : DocumentStatus.PAID;
    await prisma.billingDocument.create({
      data: {
        organizationId: org.id,
        customerId: job?.customerId ?? createdCustomers[i % createdCustomers.length].id,
        workOrderId: billed[i].id,
        kind,
        number: `${kind === DocumentKind.INVOICE ? 'FAC' : 'DEV'}-2026-${pad(i + 1, 5)}`,
        status,
        title: `${kind === DocumentKind.INVOICE ? 'Facture' : 'Devis'} ${billed[i].number}`,
        currency: 'XAF',
        subtotal,
        taxRate,
        total,
        issuedAt: dayOffset(-((i % 20) + 1)),
        dueAt: dayOffset(15),
        lines: {
          create: [
            { label: 'Main d\'œuvre', quantity: hoursBilled, unitPrice: 8500, sortOrder: 0 },
            { label: 'Déplacement', quantity: 1, unitPrice: travel, sortOrder: 1 },
          ],
        },
      },
    });
  }

  const crypto = await import('crypto');
  await prisma.portalLink.createMany({
    data: completed.slice(0, 20).map((row) => ({
      organizationId: org.id,
      workOrderId: row.id,
      token: crypto.randomBytes(24).toString('hex'),
      expiresAt: dayOffset(30),
    })),
  });

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
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
