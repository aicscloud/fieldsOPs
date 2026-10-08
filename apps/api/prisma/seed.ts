import {
  CustomerStatus,
  CustomerType,
  DocumentKind,
  DocumentStatus,
  MembershipRole,
  PrismaClient,
  UserStatus,
  WorkOrderPriority,
  WorkOrderStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();
const N = 50;
const PASSWORD = 'Demo1234!';
const DEMO_EMAIL = 'demo@fieldops.app';

const FIRST_NAMES = [
  'Amadou', 'Fatou', 'Jean', 'Marie', 'Paul', 'Sophie', 'Ibrahim', 'Aïcha',
  'Lucas', 'Camille', 'Yves', 'Nadia', 'Kevin', 'Clara', 'Omar', 'Léa',
  'Marc', 'Sarah', 'Daniel', 'Inès', 'Eric', 'Julie', 'Thomas', 'Nina',
];

const LAST_NAMES = [
  'Nkono', 'Mbarga', 'Dupont', 'Martin', 'Ngono', 'Bernard', 'Fotso', 'Petit',
  'Kamga', 'Moreau', 'Essomba', 'Laurent', 'Talla', 'Simon', 'Owona', 'Michel',
];

const CITIES = [
  { city: 'Douala', country: 'CM', lat: 4.0511, lng: 9.7679 },
  { city: 'Yaoundé', country: 'CM', lat: 3.848, lng: 11.5021 },
  { city: 'Bafoussam', country: 'CM', lat: 5.478, lng: 10.418 },
  { city: 'Paris', country: 'FR', lat: 48.8566, lng: 2.3522 },
  { city: 'Lyon', country: 'FR', lat: 45.764, lng: 4.8357 },
  { city: 'Marseille', country: 'FR', lat: 43.2965, lng: 5.3698 },
  { city: 'Lille', country: 'FR', lat: 50.6292, lng: 3.0573 },
  { city: 'Nantes', country: 'FR', lat: 47.2184, lng: -1.5536 },
];

const CATEGORIES = [
  'Maintenance HVAC', 'Installation électrique', 'Dépannage plomberie',
  'Inspection sécurité', 'Livraison matériel', 'Audit énergétique',
  'Réparation froid', 'Mise en service', 'Contrôle périodique',
  'Nettoyage technique', 'Câblage réseau', 'Remplacement filtre',
];

const PART_NAMES = [
  'Filtre HEPA', 'Joint silicone', 'Courroie V', 'Capteur température',
  'Fusible 16A', 'Vanne 1/2"', 'Cable RJ45', 'Vis M6', 'Graisse technique',
  'Batterie 12V', 'Relais 24V', 'Joint torique', 'Pompe centrifuge',
  'Thermostat digital', 'Collier inox',
];

const STATUSES: WorkOrderStatus[] = [
  WorkOrderStatus.DRAFT,
  WorkOrderStatus.SCHEDULED,
  WorkOrderStatus.ASSIGNED,
  WorkOrderStatus.EN_ROUTE,
  WorkOrderStatus.IN_PROGRESS,
  WorkOrderStatus.PAUSED,
  WorkOrderStatus.COMPLETED,
  WorkOrderStatus.CANCELLED,
  WorkOrderStatus.FAILED,
];

const PRIORITIES: WorkOrderPriority[] = [
  WorkOrderPriority.LOW,
  WorkOrderPriority.NORMAL,
  WorkOrderPriority.HIGH,
  WorkOrderPriority.URGENT,
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function pad(n: number, size = 2) {
  return String(n).padStart(size, '0');
}

function daysFromNow(offset: number, hour = 9) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  console.log(`Seeding FieldOps demo data (${N} items each)…`);

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // Nettoyage des données démo précédentes
  const oldOrg = await prisma.organization.findFirst({
    where: { name: 'FieldOps Demo' },
  });
  if (oldOrg) {
    await prisma.organization.delete({ where: { id: oldOrg.id } });
  }
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: DEMO_EMAIL },
        { email: { endsWith: '@fieldops.demo' } },
      ],
    },
  });

  const org = await prisma.organization.create({
    data: {
      name: 'FieldOps Demo',
      email: 'contact@fieldops.demo',
      phone: '+237 6 99 00 00 00',
      address: 'Boulevard de la Liberté',
      city: 'Douala',
      country: 'CM',
      currency: 'XAF',
      timezone: 'Africa/Douala',
      language: 'fr',
    },
  });

  const owner = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      passwordHash,
      firstName: 'Alex',
      lastName: 'Manager',
      phone: '+237 6 70 00 00 01',
      status: UserStatus.ACTIVE,
      memberships: {
        create: {
          organizationId: org.id,
          role: MembershipRole.OWNER,
        },
      },
    },
  });

  // —— Équipe : 50 membres (5 managers + 45 techniciens)
  const teamUsers = [];
  for (let i = 1; i <= N; i++) {
    const isManager = i <= 5;
    const user = await prisma.user.create({
      data: {
        email: `${isManager ? 'manager' : 'tech'}.${pad(i)}@fieldops.demo`,
        passwordHash,
        firstName: pick(FIRST_NAMES, i),
        lastName: pick(LAST_NAMES, i * 3),
        phone: `+237 6 5${pad(i, 7)}`.slice(0, 16),
        status: UserStatus.ACTIVE,
        memberships: {
          create: {
            organizationId: org.id,
            role: isManager
              ? MembershipRole.MANAGER
              : MembershipRole.FIELD_WORKER,
          },
        },
      },
    });
    teamUsers.push({
      ...user,
      role: isManager ? MembershipRole.MANAGER : MembershipRole.FIELD_WORKER,
    });
  }
  const workers = teamUsers.filter((u) => u.role === MembershipRole.FIELD_WORKER);

  // —— Catégories : 50
  const types = [];
  for (let i = 1; i <= N; i++) {
    const t = await prisma.workOrderType.create({
      data: {
        organizationId: org.id,
        name: `${pick(CATEGORIES, i)} ${pad(i)}`,
        description: `Catégorie seed #${i} pour interventions terrain.`,
        defaultDuration: 60 + (i % 4) * 30,
        active: true,
      },
    });
    types.push(t);
  }

  // —— Clients : 50
  const customers = [];
  for (let i = 1; i <= N; i++) {
    const loc = pick(CITIES, i);
    const company = i % 3 !== 0;
    const c = await prisma.customer.create({
      data: {
        organizationId: org.id,
        type: company ? CustomerType.COMPANY : CustomerType.INDIVIDUAL,
        name: company
          ? `${pick(['Atlas', 'Nova', 'Delta', 'Prime', 'Apex', 'Orbit'], i)} ${pick(['Services', 'Industrie', 'Energy', 'Tech', 'Logistics'], i)} ${pad(i)}`
          : `${pick(FIRST_NAMES, i)} ${pick(LAST_NAMES, i)}`,
        email: `client.${pad(i)}@example.com`,
        phone: `+33 6 ${pad(10 + (i % 80), 2)} ${pad(i * 3 % 100, 2)} ${pad(i * 7 % 100, 2)} ${pad(i, 2)}`,
        address: `${10 + (i % 90)} rue ${pick(['des Palmiers', 'de la Paix', 'du Port', 'Victor Hugo', 'Kennedy'], i)}, ${loc.city}`,
        notes: i % 4 === 0 ? 'Client VIP — accès badge requis.' : i % 5 === 0 ? 'Préférer interventions le matin.' : null,
        status: i % 17 === 0 ? CustomerStatus.INACTIVE : CustomerStatus.ACTIVE,
      },
    });
    customers.push(c);
  }

  // —— Sites : 50
  const sites = [];
  for (let i = 1; i <= N; i++) {
    const customer = pick(customers, i);
    const loc = pick(CITIES, i + 2);
    const s = await prisma.site.create({
      data: {
        organizationId: org.id,
        customerId: customer.id,
        name: `Site ${pick(['Nord', 'Sud', 'Est', 'Ouest', 'Centre', 'Usine', 'Entrepôt', 'Bureau'], i)} ${pad(i)}`,
        address: `${20 + (i % 120)} avenue ${pick(['Industrielle', 'Commerciale', 'Principale', 'Latérale'], i)}`,
        city: loc.city,
        country: loc.country,
        latitude: loc.lat + (i % 10) * 0.01,
        longitude: loc.lng + (i % 10) * 0.01,
        contactName: `${pick(FIRST_NAMES, i + 1)} ${pick(LAST_NAMES, i + 2)}`,
        contactPhone: `+237 6 99 ${pad(i, 2)} ${pad(i * 2, 2)} ${pad(i * 3, 2)}`,
        accessInstructions:
          i % 3 === 0
            ? 'Badge au poste de garde, parking P2.'
            : i % 2 === 0
              ? 'Sonner à l’accueil, demander le responsable maintenance.'
              : null,
      },
    });
    sites.push(s);
  }

  // —— Pièces / stock : 50
  const parts = [];
  for (let i = 1; i <= N; i++) {
    const p = await prisma.part.create({
      data: {
        organizationId: org.id,
        sku: `SKU-${pad(i, 4)}`,
        name: `${pick(PART_NAMES, i)} ${pad(i)}`,
        unit: pick(['pcs', 'm', 'kg', 'L', 'boîte'], i),
        quantity: 10 + (i % 40) * 3,
        minQuantity: 5 + (i % 5),
        unitCost: 5 + (i % 25) * 4.5,
        active: i % 20 !== 0,
      },
    });
    parts.push(p);
  }

  // —— Mouvements de stock : 50
  for (let i = 1; i <= N; i++) {
    const part = pick(parts, i);
    const delta = i % 2 === 0 ? 5 + (i % 10) : -(1 + (i % 5));
    await prisma.stockMovement.create({
      data: {
        organizationId: org.id,
        partId: part.id,
        delta,
        reason: delta > 0 ? 'Réception fournisseur' : 'Consommation / inventaire',
      },
    });
  }

  // —— Interventions : 50
  const workOrders = [];
  for (let i = 1; i <= N; i++) {
    const customer = pick(customers, i);
    const site =
      sites.find((s) => s.customerId === customer.id) ?? pick(sites, i);
    const type = pick(types, i);
    const status = pick(STATUSES, i);
    const worker = pick(workers, i);
    const dayOffset = (i % 21) - 7; // -7 → +13 jours
    const hour = 7 + (i % 10);
    const durationH = 1 + (i % 3);
    const unscheduled =
      status === WorkOrderStatus.DRAFT || status === WorkOrderStatus.CANCELLED;
    const scheduledStart = unscheduled ? null : daysFromNow(dayOffset, hour);
    const scheduledEnd = scheduledStart
      ? new Date(scheduledStart.getTime() + durationH * 60 * 60_000)
      : null;
    const assignable = !unscheduled;

    const wo = await prisma.workOrder.create({
      data: {
        organizationId: org.id,
        number: `WO-2026-${pad(i, 5)}`,
        title: `${type.name.split(' ').slice(0, 2).join(' ')} — ${customer.name}`,
        description: `Intervention seed #${i}. Vérifier équipements et documenter les anomalies.`,
        customerId: customer.id,
        siteId: site.id,
        typeId: type.id,
        priority: pick(PRIORITIES, i),
        status,
        assignedToId: assignable ? worker.id : null,
        scheduledStart: scheduledStart ?? undefined,
        scheduledEnd: scheduledEnd ?? undefined,
        estimatedMinutes: durationH * 60,
        startedAt:
          status === WorkOrderStatus.IN_PROGRESS ||
          status === WorkOrderStatus.COMPLETED
            ? scheduledStart ?? undefined
            : undefined,
        completedAt:
          status === WorkOrderStatus.COMPLETED
            ? scheduledEnd ?? undefined
            : undefined,
        events: {
          create: {
            organizationId: org.id,
            actorId: owner.id,
            toStatus: status,
            note: 'Créée par seed',
          },
        },
        notes: {
          create: [
            {
              organizationId: org.id,
              authorId: assignable ? worker.id : owner.id,
              body: `Note terrain #${i} : accès OK, matériel partiellement disponible.`,
            },
          ],
        },
        checklist: {
          create: [
            {
              organizationId: org.id,
              label: 'Sécurité EPI vérifiée',
              done: i % 2 === 0,
              sortOrder: 0,
            },
            {
              organizationId: org.id,
              label: 'Diagnostic réalisé',
              done: status === WorkOrderStatus.COMPLETED,
              sortOrder: 1,
            },
            {
              organizationId: org.id,
              label: 'Client informé',
              done: i % 3 === 0,
              sortOrder: 2,
            },
          ],
        },
      },
    });

    if (assignable && scheduledStart && scheduledEnd) {
      await prisma.workOrderAssignment.create({
        data: {
          organizationId: org.id,
          workOrderId: wo.id,
          fieldWorkerId: worker.id,
          assignedById: owner.id,
        },
      });
    }

    // Pièces utilisées sur ~2/3 des WO
    if (i % 3 !== 0) {
      await prisma.workOrderPart.create({
        data: {
          organizationId: org.id,
          workOrderId: wo.id,
          partId: pick(parts, i).id,
          quantity: 1 + (i % 4),
        },
      });
      if (i % 2 === 0) {
        await prisma.workOrderPart.create({
          data: {
            organizationId: org.id,
            workOrderId: wo.id,
            partId: pick(parts, i + 7).id,
            quantity: 1,
          },
        });
      }
    }

    if (status === WorkOrderStatus.COMPLETED) {
      await prisma.workOrderSignature.create({
        data: {
          organizationId: org.id,
          workOrderId: wo.id,
          signerName: pick(FIRST_NAMES, i) + ' ' + pick(LAST_NAMES, i),
          imageUrl: 'data:image/png;base64,seed',
        },
      });
    }

    workOrders.push(wo);
  }

  await prisma.workOrderCounter.upsert({
    where: { organizationId: org.id },
    create: { organizationId: org.id, lastNumber: N },
    update: { lastNumber: N },
  });

  // —— Facturation : 50 documents
  for (let i = 1; i <= N; i++) {
    const customer = pick(customers, i);
    const wo = pick(workOrders, i);
    const kind = i % 2 === 0 ? DocumentKind.INVOICE : DocumentKind.QUOTE;
    const qty = 1 + (i % 3);
    const unitPrice = 40 + (i % 20) * 15;
    const subtotal = qty * unitPrice;
    const taxRate = i % 4 === 0 ? 19.25 : 0;
    const total = subtotal * (1 + taxRate / 100);
    const statuses: DocumentStatus[] = [
      DocumentStatus.DRAFT,
      DocumentStatus.SENT,
      DocumentStatus.ACCEPTED,
      DocumentStatus.PAID,
      DocumentStatus.REJECTED,
    ];
    const doc = await prisma.billingDocument.create({
      data: {
        organizationId: org.id,
        customerId: customer.id,
        workOrderId: wo.id,
        kind,
        number: `${kind === DocumentKind.INVOICE ? 'FAC' : 'DEV'}-2026-${pad(i, 5)}`,
        status: pick(statuses, i),
        title: `${kind === DocumentKind.INVOICE ? 'Facture' : 'Devis'} ${wo.number}`,
        notes: 'Document généré par le seed FieldOps.',
        currency: org.currency,
        subtotal,
        taxRate,
        total,
        issuedAt: daysFromNow(-((i % 14) + 1)),
        dueAt: daysFromNow((i % 14) + 7),
        lines: {
          create: [
            {
              label: 'Main d’œuvre',
              quantity: qty,
              unitPrice,
              sortOrder: 0,
            },
            {
              label: 'Frais de déplacement',
              quantity: 1,
              unitPrice: 15 + (i % 5) * 5,
              sortOrder: 1,
            },
          ],
        },
      },
    });
    void doc;
  }

  // —— Portail client : 50 liens
  for (let i = 1; i <= N; i++) {
    const wo = pick(workOrders, i);
    await prisma.portalLink.create({
      data: {
        organizationId: org.id,
        workOrderId: wo.id,
        token: randomBytes(24).toString('hex'),
        expiresAt: daysFromNow(30 + (i % 10)),
      },
    });
  }

  console.log('—— Seed OK ——');
  console.log(`Organisation : ${org.name}`);
  console.log(`Login        : ${DEMO_EMAIL}`);
  console.log(`Mot de passe : ${PASSWORD}`);
  console.log(`Équipe       : ${N} (+ owner)`);
  console.log(`Clients      : ${N}`);
  console.log(`Sites        : ${N}`);
  console.log(`Catégories   : ${N}`);
  console.log(`Interventions: ${N}`);
  console.log(`Pièces       : ${N}`);
  console.log(`Mouvements   : ${N}`);
  console.log(`Documents    : ${N}`);
  console.log(`Liens portail: ${N}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
