import {
  CustomerStatus,
  CustomerType,
  DocumentKind,
  DocumentStatus,
  EquipmentPlacement,
  InterventionKind,
  MembershipRole,
  PrismaClient,
  TeamGroup,
  UserStatus,
  WorkOrderPriority,
  WorkOrderStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

const PASSWORD = 'Demo1234!';
const OWNER_EMAIL = 'demo@fieldops.app';
const MANAGER_EMAIL = 'aicha.mbarga@fieldops.demo';
const FIELD_EMAIL = 'jean.fotso@fieldops.demo';
const FIELD2_EMAIL = 'paul.essomba@fieldops.demo';
const TRANSPORT_EMAIL = 'yves.kamga@fieldops.demo';

const LABOR_RATE = 8500;
const TAX_RATE = 19.25;

function pad(n: number, size = 5) {
  return String(n).padStart(size, '0');
}

function dayOffset(offset: number, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60_000);
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  console.log('Nettoyage de Climafrique…');
  const oldOrgs = await prisma.organization.findMany({
    where: { name: { in: ['FieldOps Demo', 'Climafrique'] } },
    select: { id: true },
  });
  for (const old of oldOrgs) {
    await prisma.organization.delete({ where: { id: old.id } });
  }
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: OWNER_EMAIL },
        { email: { endsWith: '@fieldops.demo' } },
      ],
    },
  });

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

  const [techGroup, transportGroup] = await Promise.all([
    prisma.group.create({ data: { organizationId: org.id, name: 'Techniciens Douala' } }),
    prisma.group.create({ data: { organizationId: org.id, name: 'Transport Douala' } }),
  ]);

  const owner = await prisma.user.create({
    data: {
      email: OWNER_EMAIL,
      passwordHash,
      firstName: 'Amadou',
      lastName: 'Nkono',
      phone: '+237 690 11 22 33',
      status: UserStatus.ACTIVE,
      memberships: {
        create: { organizationId: org.id, role: MembershipRole.OWNER, team: TeamGroup.FIELD },
      },
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: MANAGER_EMAIL,
      passwordHash,
      firstName: 'Aïcha',
      lastName: 'Mbarga',
      phone: '+237 690 22 33 44',
      status: UserStatus.ACTIVE,
      memberships: {
        create: { organizationId: org.id, role: MembershipRole.MANAGER, team: TeamGroup.FIELD },
      },
    },
  });

  const jean = await prisma.user.create({
    data: {
      email: FIELD_EMAIL,
      passwordHash,
      firstName: 'Jean',
      lastName: 'Fotso',
      phone: '+237 690 33 44 55',
      status: UserStatus.ACTIVE,
      memberships: {
        create: {
          organizationId: org.id,
          role: MembershipRole.FIELD_WORKER,
          team: TeamGroup.FIELD,
          groupId: techGroup.id,
        },
      },
    },
  });

  const paul = await prisma.user.create({
    data: {
      email: FIELD2_EMAIL,
      passwordHash,
      firstName: 'Paul',
      lastName: 'Essomba',
      phone: '+237 690 44 55 66',
      status: UserStatus.ACTIVE,
      memberships: {
        create: {
          organizationId: org.id,
          role: MembershipRole.FIELD_WORKER,
          team: TeamGroup.FIELD,
          groupId: techGroup.id,
        },
      },
    },
  });

  const yves = await prisma.user.create({
    data: {
      email: TRANSPORT_EMAIL,
      passwordHash,
      firstName: 'Yves',
      lastName: 'Kamga',
      phone: '+237 690 55 66 77',
      status: UserStatus.ACTIVE,
      memberships: {
        create: {
          organizationId: org.id,
          role: MembershipRole.FIELD_WORKER,
          team: TeamGroup.TRANSPORT,
          groupId: transportGroup.id,
        },
      },
    },
  });

  const [installType, maintenanceType, repairType, replaceType] =
    await prisma.workOrderType.createManyAndReturn({
      data: [
        {
          organizationId: org.id,
          name: 'Installation climatisation',
          description: 'Pose d’un split, raccordement et mise en service.',
          kind: InterventionKind.INSTALLATION,
          defaultDuration: 180,
        },
        {
          organizationId: org.id,
          name: 'Maintenance climatisation',
          description: 'Visite d’entretien périodique.',
          kind: InterventionKind.REPAIR,
          defaultDuration: 90,
        },
        {
          organizationId: org.id,
          name: 'Dépannage urgent',
          description: 'Panne bloquante, intervention prioritaire.',
          kind: InterventionKind.REPAIR,
          defaultDuration: 90,
        },
        {
          organizationId: org.id,
          name: 'Changement de climatiseur',
          description: 'Dépose de l’appareil en place et pose d’un neuf.',
          kind: InterventionKind.REPLACEMENT,
          defaultDuration: 180,
        },
      ],
    });

  const parts = await prisma.part.createManyAndReturn({
    data: [
      { organizationId: org.id, sku: 'SPLIT-12', name: 'Climatiseur split 12 000 BTU', unit: 'pcs', quantity: 8, minQuantity: 2, unitCost: 185000, salePrice: 275000 },
      { organizationId: org.id, sku: 'SPLIT-18', name: 'Climatiseur split 18 000 BTU', unit: 'pcs', quantity: 4, minQuantity: 2, unitCost: 265000, salePrice: 385000 },
      { organizationId: org.id, sku: 'FIL-G4', name: 'Filtre G4 climatisation', unit: 'pcs', quantity: 36, minQuantity: 10, unitCost: 4500, salePrice: 6500 },
      { organizationId: org.id, sku: 'GAZ-R410', name: 'Fluide R410A', unit: 'kg', quantity: 12, minQuantity: 4, unitCost: 12000, salePrice: 17500 },
      { organizationId: org.id, sku: 'CAPT-T', name: 'Sonde de température', unit: 'pcs', quantity: 6, minQuantity: 3, unitCost: 15000, salePrice: 22000 },
      { organizationId: org.id, sku: 'JOINT-TOR', name: 'Joint torique assortiment', unit: 'boîte', quantity: 2, minQuantity: 4, unitCost: 3500, salePrice: 5000 },
    ],
  });
  const part = (sku: string) => {
    const found = parts.find((p) => p.sku === sku);
    if (!found) throw new Error(sku);
    return found;
  };

  const banque = await prisma.customer.create({
    data: {
      organizationId: org.id,
      type: CustomerType.COMPANY,
      name: 'Banque Agence Akwa',
      email: 'technique@banque-akwa.cm',
      phone: '+237 233 43 10 10',
      address: '12 Boulevard de la Liberté, Akwa, Douala',
      notes: 'Badge à l’accueil. Prévenir le responsable technique.',
      status: CustomerStatus.ACTIVE,
      sites: {
        create: {
          organizationId: org.id,
          name: 'Bâtiment principal',
          address: '12 Boulevard de la Liberté, Akwa',
          city: 'Douala',
          country: 'CM',
          latitude: 4.0511,
          longitude: 9.7679,
          contactName: 'Fatou Mbarga',
          contactPhone: '+237 677 10 20 30',
          accessInstructions: 'Se présenter à l’accueil, badge visiteur.',
        },
      },
    },
    include: { sites: true },
  });

  const hotel = await prisma.customer.create({
    data: {
      organizationId: org.id,
      type: CustomerType.COMPANY,
      name: 'Hôtel Akwa Palace',
      email: 'maintenance@akwapalace.cm',
      phone: '+237 233 42 26 01',
      address: '48 Avenue de Gaulle, Akwa, Douala',
      notes: 'Contrat semestriel sur les splits des chambres.',
      status: CustomerStatus.ACTIVE,
      sites: {
        create: {
          organizationId: org.id,
          name: 'Réception et étages',
          address: '48 Avenue de Gaulle, Akwa',
          city: 'Douala',
          country: 'CM',
          latitude: 4.0482,
          longitude: 9.7611,
          contactName: 'Serge Nkono',
          contactPhone: '+237 677 20 30 40',
          accessInstructions: 'Entrée technique côté parking.',
        },
      },
    },
    include: { sites: true },
  });

  const clinique = await prisma.customer.create({
    data: {
      organizationId: org.id,
      type: CustomerType.COMPANY,
      name: 'Clinique des Palmiers',
      email: 'logistique@palmiers.cm',
      phone: '+237 233 40 18 18',
      address: '7 Rue Bonanjo, Douala',
      status: CustomerStatus.ACTIVE,
      sites: {
        create: {
          organizationId: org.id,
          name: 'Bloc consultation',
          address: '7 Rue Bonanjo',
          city: 'Douala',
          country: 'CM',
          latitude: 4.043,
          longitude: 9.69,
          contactName: 'Dr. Inès Owona',
          contactPhone: '+237 677 30 40 50',
        },
      },
    },
    include: { sites: true },
  });

  const superM = await prisma.customer.create({
    data: {
      organizationId: org.id,
      type: CustomerType.COMPANY,
      name: 'Supermarché Bonapriso',
      email: 'direction@super-bonapriso.cm',
      phone: '+237 233 41 55 00',
      address: '22 Rue Joss, Bonapriso, Douala',
      notes: 'Pas encore de contrat. Parc posé à l’installation.',
      status: CustomerStatus.ACTIVE,
      sites: {
        create: {
          organizationId: org.id,
          name: 'Surface de vente',
          address: '22 Rue Joss, Bonapriso',
          city: 'Douala',
          country: 'CM',
          latitude: 4.013,
          longitude: 9.708,
          contactName: 'Marc Talla',
          contactPhone: '+237 677 40 50 60',
        },
      },
    },
    include: { sites: true },
  });

  const usine = await prisma.customer.create({
    data: {
      organizationId: org.id,
      type: CustomerType.COMPANY,
      name: 'Usine Textile du Wouri',
      email: 'atelier@textile-wouri.cm',
      phone: '+237 233 39 12 12',
      address: 'Zone industrielle Bonabéri, Douala',
      status: CustomerStatus.ACTIVE,
      sites: {
        create: {
          organizationId: org.id,
          name: 'Atelier',
          address: 'Zone industrielle Bonabéri',
          city: 'Douala',
          country: 'CM',
          latitude: 4.08,
          longitude: 9.67,
          contactName: 'Brice Fotso',
          contactPhone: '+237 677 50 60 70',
          accessInstructions: 'Quai de livraison, casque obligatoire.',
        },
      },
    },
    include: { sites: true },
  });

  const residence = await prisma.customer.create({
    data: {
      organizationId: org.id,
      type: CustomerType.INDIVIDUAL,
      name: 'Résidence Bonamoussadi',
      email: 'syndic@bonamoussadi.cm',
      phone: '+237 677 60 70 80',
      address: 'Résidence Les Manguiers, Bonamoussadi',
      status: CustomerStatus.INACTIVE,
      sites: {
        create: {
          organizationId: org.id,
          name: 'Hall et locaux techniques',
          address: 'Résidence Les Manguiers',
          city: 'Douala',
          country: 'CM',
          latitude: 4.09,
          longitude: 9.74,
          contactName: 'Chantal Ngono',
          contactPhone: '+237 677 60 70 80',
        },
      },
    },
    include: { sites: true },
  });

  const banqueSite = banque.sites[0];
  const hotelSite = hotel.sites[0];
  const cliniqueSite = clinique.sites[0];
  const superSite = superM.sites[0];
  const usineSite = usine.sites[0];
  const residenceSite = residence.sites[0];

  const year = new Date().getFullYear();
  let seq = 1;
  const number = () => `WO-${year}-${pad(seq++)}`;

  type JobInput = {
    title: string;
    description: string;
    customerId: string;
    siteId: string;
    typeId: string;
    kind: InterventionKind;
    priority?: WorkOrderPriority;
    status: WorkOrderStatus;
    assignedToId?: string;
    start?: Date;
    minutes: number;
    team?: TeamGroup;
    parentId?: string;
  };

  async function createJob(input: JobInput) {
    const start = input.start ?? dayOffset(0, 9);
    const end = addMinutes(start, input.minutes);
    const done = input.status === WorkOrderStatus.COMPLETED;
    const live =
      input.status === WorkOrderStatus.IN_PROGRESS ||
      input.status === WorkOrderStatus.EN_ROUTE ||
      input.status === WorkOrderStatus.PAUSED;
    const wo = await prisma.workOrder.create({
      data: {
        organizationId: org.id,
        number: number(),
        title: input.title,
        description: input.description,
        customerId: input.customerId,
        siteId: input.siteId,
        typeId: input.typeId,
        kind: input.kind,
        priority: input.priority ?? WorkOrderPriority.NORMAL,
        status: input.status,
        team: input.team ?? TeamGroup.FIELD,
        assignedToId: input.assignedToId,
        parentId: input.parentId,
        scheduledStart: start,
        scheduledEnd: end,
        estimatedMinutes: input.minutes,
        startedAt: done || live || input.status === WorkOrderStatus.PAUSED ? start : null,
        completedAt: done ? end : null,
      },
    });
    await prisma.workOrderEvent.create({
      data: {
        organizationId: org.id,
        workOrderId: wo.id,
        actorId: manager.id,
        toStatus: input.status,
        note: 'Planifiée par le bureau',
      },
    });
    if (input.assignedToId && input.status !== WorkOrderStatus.DRAFT) {
      await prisma.workOrderAssignment.create({
        data: {
          organizationId: org.id,
          workOrderId: wo.id,
          fieldWorkerId: input.assignedToId,
          assignedById: manager.id,
        },
      });
    }
    return wo;
  }

  const installBanque = await createJob({
    title: 'Installation climatisation — Banque Agence Akwa',
    description: 'Pose de deux splits 12 000 BTU en salle des marchés.',
    customerId: banque.id,
    siteId: banqueSite.id,
    typeId: installType.id,
    kind: InterventionKind.INSTALLATION,
    status: WorkOrderStatus.COMPLETED,
    assignedToId: jean.id,
    start: dayOffset(-40, 8),
    minutes: 180,
  });

  const installHotel = await createJob({
    title: 'Installation climatisation — Hôtel Akwa Palace',
    description: 'Pose des splits chambres 2e étage.',
    customerId: hotel.id,
    siteId: hotelSite.id,
    typeId: installType.id,
    kind: InterventionKind.INSTALLATION,
    status: WorkOrderStatus.COMPLETED,
    assignedToId: paul.id,
    start: dayOffset(-55, 8),
    minutes: 180,
  });

  const installClinique = await createJob({
    title: 'Installation climatisation — Clinique des Palmiers',
    description: 'Split 18 000 BTU en salle d’attente.',
    customerId: clinique.id,
    siteId: cliniqueSite.id,
    typeId: installType.id,
    kind: InterventionKind.INSTALLATION,
    status: WorkOrderStatus.COMPLETED,
    assignedToId: jean.id,
    start: dayOffset(-70, 9),
    minutes: 180,
  });

  const installSuper = await createJob({
    title: 'Installation climatisation — Supermarché Bonapriso',
    description: 'Cassette caisse principale.',
    customerId: superM.id,
    siteId: superSite.id,
    typeId: installType.id,
    kind: InterventionKind.INSTALLATION,
    status: WorkOrderStatus.COMPLETED,
    assignedToId: paul.id,
    start: dayOffset(-20, 8),
    minutes: 180,
  });

  const lastHotelVisit = await createJob({
    title: 'Visite de maintenance — Hôtel Akwa Palace',
    description: 'Entretien contractuel. Filtres encrassés, pressions normales.',
    customerId: hotel.id,
    siteId: hotelSite.id,
    typeId: maintenanceType.id,
    kind: InterventionKind.REPAIR,
    status: WorkOrderStatus.COMPLETED,
    assignedToId: jean.id,
    start: dayOffset(-10, 9),
    minutes: 90,
  });

  const lastCliniqueVisit = await createJob({
    title: 'Visite de maintenance — Clinique des Palmiers',
    description: 'Contrôle périodique réalisé selon le contrat.',
    customerId: clinique.id,
    siteId: cliniqueSite.id,
    typeId: maintenanceType.id,
    kind: InterventionKind.REPAIR,
    status: WorkOrderStatus.COMPLETED,
    assignedToId: paul.id,
    start: dayOffset(-45, 10),
    minutes: 90,
  });

  const completedRepair = await createJob({
    title: 'Dépannage urgent — Banque Agence Akwa',
    description: 'Salle des marchés trop chaude. Sonde remplacée.',
    customerId: banque.id,
    siteId: banqueSite.id,
    typeId: repairType.id,
    kind: InterventionKind.REPAIR,
    priority: WorkOrderPriority.URGENT,
    status: WorkOrderStatus.COMPLETED,
    assignedToId: jean.id,
    start: dayOffset(-3, 14),
    minutes: 90,
  });

  const replacement = await createJob({
    title: 'Changement de climatiseur — Hôtel Akwa Palace',
    description: 'Split chambre 214 HS. Appareil neuf posé, ancien déposé.',
    customerId: hotel.id,
    siteId: hotelSite.id,
    typeId: replaceType.id,
    kind: InterventionKind.REPLACEMENT,
    status: WorkOrderStatus.COMPLETED,
    assignedToId: paul.id,
    start: dayOffset(-8, 8),
    minutes: 180,
  });

  const cancelled = await createJob({
    title: 'Maintenance climatisation — Résidence Bonamoussadi',
    description: 'Client injoignable, visite annulée.',
    customerId: residence.id,
    siteId: residenceSite.id,
    typeId: maintenanceType.id,
    kind: InterventionKind.REPAIR,
    status: WorkOrderStatus.CANCELLED,
    assignedToId: jean.id,
    start: dayOffset(-6, 11),
    minutes: 90,
  });

  const failed = await createJob({
    title: 'Dépannage urgent — Usine Textile du Wouri',
    description: 'Pièce manquante sur place. À replanifier.',
    customerId: usine.id,
    siteId: usineSite.id,
    typeId: repairType.id,
    kind: InterventionKind.REPAIR,
    priority: WorkOrderPriority.HIGH,
    status: WorkOrderStatus.FAILED,
    assignedToId: paul.id,
    start: dayOffset(-2, 15),
    minutes: 90,
  });

  const overdue = await createJob({
    title: 'Maintenance climatisation — Hôtel Akwa Palace',
    description: 'Visite prévue hier, pas encore commencée.',
    customerId: hotel.id,
    siteId: hotelSite.id,
    typeId: maintenanceType.id,
    kind: InterventionKind.REPAIR,
    status: WorkOrderStatus.ASSIGNED,
    assignedToId: jean.id,
    start: dayOffset(-1, 9),
    minutes: 90,
  });

  const unassigned = await createJob({
    title: 'Dépannage urgent — Supermarché Bonapriso',
    description: 'Rayon frais trop chaud. À affecter.',
    customerId: superM.id,
    siteId: superSite.id,
    typeId: repairType.id,
    kind: InterventionKind.REPAIR,
    priority: WorkOrderPriority.URGENT,
    status: WorkOrderStatus.SCHEDULED,
    start: dayOffset(0, 11),
    minutes: 90,
  });

  const draft = await createJob({
    title: 'Installation climatisation — Usine Textile du Wouri',
    description: 'Nouveau split bureau direction. Brouillon à planifier.',
    customerId: usine.id,
    siteId: usineSite.id,
    typeId: installType.id,
    kind: InterventionKind.INSTALLATION,
    status: WorkOrderStatus.DRAFT,
    start: dayOffset(3, 8),
    minutes: 180,
  });

  const todayJean = await createJob({
    title: 'Maintenance climatisation — Banque Agence Akwa',
    description: 'Visite du matin, Jean Fotso.',
    customerId: banque.id,
    siteId: banqueSite.id,
    typeId: maintenanceType.id,
    kind: InterventionKind.REPAIR,
    status: WorkOrderStatus.ASSIGNED,
    assignedToId: jean.id,
    start: dayOffset(0, 8),
    minutes: 90,
  });

  const enRoute = await createJob({
    title: 'Dépannage urgent — Clinique des Palmiers',
    description: 'Jean est en route.',
    customerId: clinique.id,
    siteId: cliniqueSite.id,
    typeId: repairType.id,
    kind: InterventionKind.REPAIR,
    priority: WorkOrderPriority.URGENT,
    status: WorkOrderStatus.EN_ROUTE,
    assignedToId: jean.id,
    start: dayOffset(0, 10, 30),
    minutes: 90,
  });

  const inProgress = await createJob({
    title: 'Maintenance climatisation — Clinique des Palmiers',
    description: 'Paul est sur place.',
    customerId: clinique.id,
    siteId: cliniqueSite.id,
    typeId: maintenanceType.id,
    kind: InterventionKind.REPAIR,
    status: WorkOrderStatus.IN_PROGRESS,
    assignedToId: paul.id,
    start: dayOffset(0, 9),
    minutes: 90,
  });

  const paused = await createJob({
    title: 'Installation climatisation — Hôtel Akwa Palace',
    description: 'Pause : attendre le second split en stock.',
    customerId: hotel.id,
    siteId: hotelSite.id,
    typeId: installType.id,
    kind: InterventionKind.INSTALLATION,
    status: WorkOrderStatus.PAUSED,
    assignedToId: paul.id,
    start: dayOffset(0, 14),
    minutes: 180,
  });

  const tomorrow = await createJob({
    title: 'Maintenance climatisation — Banque Agence Akwa',
    description: 'Créneau de demain pour Jean.',
    customerId: banque.id,
    siteId: banqueSite.id,
    typeId: maintenanceType.id,
    kind: InterventionKind.REPAIR,
    status: WorkOrderStatus.ASSIGNED,
    assignedToId: jean.id,
    start: dayOffset(1, 9),
    minutes: 90,
  });

  const laterWeek = await createJob({
    title: 'Installation climatisation — Usine Textile du Wouri',
    description: 'Pose prévue en fin de semaine, avec transport.',
    customerId: usine.id,
    siteId: usineSite.id,
    typeId: installType.id,
    kind: InterventionKind.INSTALLATION,
    status: WorkOrderStatus.ASSIGNED,
    assignedToId: jean.id,
    start: dayOffset(4, 8),
    minutes: 180,
  });

  await createJob({
    title: 'Transport — Usine Textile du Wouri',
    description: `Livraison du matériel pour ${laterWeek.number}.`,
    customerId: usine.id,
    siteId: usineSite.id,
    typeId: installType.id,
    kind: InterventionKind.INSTALLATION,
    status: WorkOrderStatus.ASSIGNED,
    assignedToId: yves.id,
    start: dayOffset(4, 8),
    minutes: 60,
    team: TeamGroup.TRANSPORT,
    parentId: laterWeek.id,
  });

  await prisma.workOrderChecklistItem.createMany({
    data: [
      { organizationId: org.id, workOrderId: todayJean.id, label: 'Couper l’alimentation', sortOrder: 0, done: false },
      { organizationId: org.id, workOrderId: todayJean.id, label: 'Nettoyer les filtres', sortOrder: 1, done: false },
      { organizationId: org.id, workOrderId: todayJean.id, label: 'Contrôler les pressions', sortOrder: 2, done: false },
      { organizationId: org.id, workOrderId: inProgress.id, label: 'Relevé des températures', sortOrder: 0, done: true },
      { organizationId: org.id, workOrderId: inProgress.id, label: 'Essai en charge', sortOrder: 1, done: false },
    ],
  });

  await prisma.workOrderNote.create({
    data: {
      organizationId: org.id,
      workOrderId: completedRepair.id,
      authorId: jean.id,
      body: 'Sonde HS sur l’unité salle des marchés. Remplacée, client a signé.',
    },
  });

  await prisma.workOrderTimeEntry.createMany({
    data: [
      {
        organizationId: org.id,
        workOrderId: completedRepair.id,
        startedAt: dayOffset(-3, 14),
        endedAt: dayOffset(-3, 15, 30),
      },
      {
        organizationId: org.id,
        workOrderId: lastHotelVisit.id,
        startedAt: dayOffset(-10, 9),
        endedAt: dayOffset(-10, 10, 20),
      },
      {
        organizationId: org.id,
        workOrderId: inProgress.id,
        startedAt: dayOffset(0, 9),
      },
    ],
  });

  await prisma.workOrderSignature.createMany({
    data: [
      {
        organizationId: org.id,
        workOrderId: completedRepair.id,
        signerName: 'Fatou Mbarga',
        imageUrl: 'data:image/png;base64,seed',
        signedAt: dayOffset(-3, 15, 30),
      },
      {
        organizationId: org.id,
        workOrderId: lastHotelVisit.id,
        signerName: 'Serge Nkono',
        imageUrl: 'data:image/png;base64,seed',
        signedAt: dayOffset(-10, 10, 20),
      },
    ],
  });

  async function consume(
    workOrderId: string,
    sku: string,
    quantity: number,
    serial?: string,
    installed?: { customerId: string; siteId: string; at: Date; status?: EquipmentPlacement },
  ) {
    const p = part(sku);
    const usage = await prisma.workOrderPart.create({
      data: {
        organizationId: org.id,
        workOrderId,
        partId: p.id,
        quantity,
      },
    });
    await prisma.part.update({
      where: { id: p.id },
      data: { quantity: { decrement: quantity } },
    });
    await prisma.stockMovement.create({
      data: {
        organizationId: org.id,
        partId: p.id,
        delta: -quantity,
        reason: serial ? `Pose n° ${serial}` : `Consommation ${sku}`,
      },
    });
    if (!installed || !serial) return usage;
    await prisma.installedEquipment.create({
      data: {
        organizationId: org.id,
        partId: p.id,
        serialNumber: serial,
        status: installed.status ?? EquipmentPlacement.INSTALLED,
        customerId: installed.customerId,
        siteId: installed.siteId,
        workOrderId,
        workOrderPartId: usage.id,
        installedAt: installed.at,
        removedAt: installed.status === EquipmentPlacement.REMOVED ? addMinutes(installed.at, 60) : null,
      },
    });
    return usage;
  }

  await consume(installBanque.id, 'SPLIT-12', 1, 'CF-AKWA-12001', {
    customerId: banque.id,
    siteId: banqueSite.id,
    at: dayOffset(-40, 8),
  });
  await consume(installBanque.id, 'SPLIT-12', 1, 'CF-AKWA-12002', {
    customerId: banque.id,
    siteId: banqueSite.id,
    at: dayOffset(-40, 10),
  });
  await consume(installHotel.id, 'SPLIT-12', 1, 'CF-HTL-12001', {
    customerId: hotel.id,
    siteId: hotelSite.id,
    at: dayOffset(-55, 8),
  });
  await consume(installHotel.id, 'SPLIT-12', 1, 'CF-HTL-12002', {
    customerId: hotel.id,
    siteId: hotelSite.id,
    at: dayOffset(-55, 11),
    status: EquipmentPlacement.REMOVED,
  });
  await consume(installClinique.id, 'SPLIT-18', 1, 'CF-CLI-18001', {
    customerId: clinique.id,
    siteId: cliniqueSite.id,
    at: dayOffset(-70, 9),
  });
  await consume(installSuper.id, 'SPLIT-12', 1, 'CF-SUP-12001', {
    customerId: superM.id,
    siteId: superSite.id,
    at: dayOffset(-20, 8),
  });
  await consume(replacement.id, 'SPLIT-18', 1, 'CF-HTL-18001', {
    customerId: hotel.id,
    siteId: hotelSite.id,
    at: dayOffset(-8, 8),
  });
  await consume(lastHotelVisit.id, 'FIL-G4', 2);
  await consume(completedRepair.id, 'CAPT-T', 1);
  await consume(completedRepair.id, 'GAZ-R410', 1);

  const oldHotelUnit = await prisma.installedEquipment.findFirst({
    where: { serialNumber: 'CF-HTL-12002' },
  });
  const newHotelUnit = await prisma.installedEquipment.findFirst({
    where: { serialNumber: 'CF-HTL-18001' },
  });
  const banqueUnit = await prisma.installedEquipment.findFirst({
    where: { serialNumber: 'CF-AKWA-12001' },
  });
  if (oldHotelUnit && newHotelUnit) {
    const spare = await prisma.workOrderPart.findFirst({
      where: { workOrderId: replacement.id, partId: part('SPLIT-18').id },
    });
    await prisma.equipmentRepair.create({
      data: {
        organizationId: org.id,
        installedEquipmentId: oldHotelUnit.id,
        workOrderId: replacement.id,
        summary: 'Compresseur HS. Appareil remplacé par n° CF-HTL-18001.',
        replacementId: newHotelUnit.id,
        parts: spare
          ? { create: { workOrderPartId: spare.id } }
          : undefined,
      },
    });
  }
  if (banqueUnit) {
    const spare = await prisma.workOrderPart.findFirst({
      where: { workOrderId: completedRepair.id, partId: part('CAPT-T').id },
    });
    await prisma.equipmentRepair.create({
      data: {
        organizationId: org.id,
        installedEquipmentId: banqueUnit.id,
        workOrderId: completedRepair.id,
        summary: 'Sonde de température remplacée.',
        parts: spare ? { create: { workOrderPartId: spare.id } } : undefined,
      },
    });
  }

  const contractOverdue = await prisma.maintenanceContract.create({
    data: {
      organizationId: org.id,
      customerId: hotel.id,
      siteId: hotelSite.id,
      installedEquipmentId: newHotelUnit?.id,
      typeId: maintenanceType.id,
      kind: InterventionKind.REPAIR,
      title: 'Visite de maintenance',
      intervalMonths: 6,
      nextDueAt: dayOffset(-5, 8),
      lastVisitAt: dayOffset(-10, 10),
      active: true,
      notes: 'Semestriel, splits chambres.',
    },
  });
  const contractDue = await prisma.maintenanceContract.create({
    data: {
      organizationId: org.id,
      customerId: banque.id,
      siteId: banqueSite.id,
      typeId: maintenanceType.id,
      kind: InterventionKind.REPAIR,
      title: 'Visite de maintenance',
      intervalMonths: 6,
      nextDueAt: dayOffset(7, 8),
      lastVisitAt: dayOffset(-40, 11),
      active: true,
      notes: 'Tout le site, salle des marchés.',
    },
  });
  await prisma.maintenanceContract.create({
    data: {
      organizationId: org.id,
      customerId: clinique.id,
      siteId: cliniqueSite.id,
      installedEquipmentId: (
        await prisma.installedEquipment.findFirst({ where: { serialNumber: 'CF-CLI-18001' } })
      )?.id,
      typeId: maintenanceType.id,
      kind: InterventionKind.REPAIR,
      title: 'Visite de maintenance',
      intervalMonths: 3,
      nextDueAt: dayOffset(45, 8),
      lastVisitAt: dayOffset(-45, 11),
      active: true,
    },
  });
  await prisma.maintenanceContract.create({
    data: {
      organizationId: org.id,
      customerId: residence.id,
      siteId: residenceSite.id,
      typeId: maintenanceType.id,
      kind: InterventionKind.REPAIR,
      title: 'Visite de maintenance',
      intervalMonths: 12,
      nextDueAt: dayOffset(120, 8),
      active: false,
      notes: 'Contrat suspendu, client inactif.',
    },
  });

  await prisma.workOrder.update({
    where: { id: overdue.id },
    data: { contractId: contractOverdue.id },
  });
  await prisma.workOrder.update({
    where: { id: tomorrow.id },
    data: { contractId: contractDue.id },
  });

  async function invoice(opts: {
    kind: DocumentKind;
    status: DocumentStatus;
    customerId: string;
    workOrderId?: string;
    title: string;
    lines: { label: string; quantity: number; unitPrice: number }[];
    daysAgo: number;
  }) {
    const subtotal = opts.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
    const total = subtotal * (1 + TAX_RATE / 100);
    const count = await prisma.billingDocument.count({
      where: { organizationId: org.id, kind: opts.kind },
    });
    const prefix = opts.kind === DocumentKind.QUOTE ? 'DEV' : 'FAC';
    return prisma.billingDocument.create({
      data: {
        organizationId: org.id,
        customerId: opts.customerId,
        workOrderId: opts.workOrderId,
        kind: opts.kind,
        status: opts.status,
        number: `${prefix}-${year}-${pad(count + 1)}`,
        title: opts.title,
        currency: 'XAF',
        subtotal,
        taxRate: TAX_RATE,
        total,
        issuedAt: dayOffset(-opts.daysAgo, 17),
        dueAt: dayOffset(7 - opts.daysAgo, 17),
        lines: { create: opts.lines.map((line, i) => ({ ...line, sortOrder: i })) },
      },
    });
  }

  await invoice({
    kind: DocumentKind.INVOICE,
    status: DocumentStatus.PAID,
    customerId: banque.id,
    workOrderId: completedRepair.id,
    title: `Facture ${completedRepair.number} — dépannage`,
    daysAgo: 2,
    lines: [
      { label: 'Main d’œuvre', quantity: 1.5, unitPrice: LABOR_RATE },
      { label: 'Sonde de température (CAPT-T)', quantity: 1, unitPrice: 22000 },
      { label: 'Fluide R410A (GAZ-R410)', quantity: 1, unitPrice: 17500 },
    ],
  });
  await invoice({
    kind: DocumentKind.INVOICE,
    status: DocumentStatus.SENT,
    customerId: hotel.id,
    workOrderId: lastHotelVisit.id,
    title: `Facture ${lastHotelVisit.number} — visite de maintenance`,
    daysAgo: 8,
    lines: [
      { label: 'Main d’œuvre', quantity: 1.3, unitPrice: LABOR_RATE },
      { label: 'Filtre G4 climatisation (FIL-G4)', quantity: 2, unitPrice: 6500 },
    ],
  });
  await invoice({
    kind: DocumentKind.QUOTE,
    status: DocumentStatus.ACCEPTED,
    customerId: usine.id,
    workOrderId: draft.id,
    title: `Devis ${draft.number} — pose split direction`,
    daysAgo: 4,
    lines: [
      { label: 'Main d’œuvre', quantity: 3, unitPrice: LABOR_RATE },
      { label: 'Climatiseur split 12 000 BTU (SPLIT-12)', quantity: 1, unitPrice: 275000 },
    ],
  });
  await invoice({
    kind: DocumentKind.QUOTE,
    status: DocumentStatus.DRAFT,
    customerId: superM.id,
    title: 'Devis contrat semestriel — supermarché',
    daysAgo: 1,
    lines: [
      { label: 'Visite de maintenance (forfait)', quantity: 2, unitPrice: 45000 },
    ],
  });

  await prisma.portalLink.create({
    data: {
      organizationId: org.id,
      workOrderId: completedRepair.id,
      token: randomBytes(24).toString('hex'),
      expiresAt: dayOffset(30, 12),
    },
  });

  await prisma.workOrderCounter.upsert({
    where: { organizationId: org.id },
    create: { organizationId: org.id, lastNumber: seq - 1 },
    update: { lastNumber: seq - 1 },
  });

  console.log('—— Seed OK — Climafrique, parcours complets ——');
  console.log(`Bureau       : ${OWNER_EMAIL}  /  ${PASSWORD}`);
  console.log(`Planning     : ${MANAGER_EMAIL}  /  ${PASSWORD}`);
  console.log(`Terrain      : ${FIELD_EMAIL}  /  ${PASSWORD}`);
  console.log(`Terrain 2    : ${FIELD2_EMAIL}  /  ${PASSWORD}`);
  console.log(`Transport    : ${TRANSPORT_EMAIL}  /  ${PASSWORD}`);
  console.log(`Clients      : 6  | Sites : 6  | Contrats : 4`);
  console.log(`Interventions: ${seq - 1}  | Parc + factures + portail inclus`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
