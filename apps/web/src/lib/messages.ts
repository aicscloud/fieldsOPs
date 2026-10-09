export type Locale = 'fr' | 'en';

export type Catalog = {
  nav: Record<string, string>;
  shell: Record<string, string>;
  pub: Record<string, string>;
  home: {
    kicker: string;
    title: string;
    lead: string;
    lead2: string;
    points: { title: string; text: string }[];
    stories: { image: string; alt: string; title: string; paragraphs: string[] }[];
    photoAlt: string;
    boardTitle: string;
    boardText: string;
    faqTitle: string;
    closeTitle: string;
    closeText: string;
  };
  faq: { q: string; a: string }[];
  auth: Record<string, string>;
  terms: { title: string; updated: string; sections: { h: string; p: string }[] };
  legal: { title: string; sections: { h: string; p: string }[] };
};

const fr: Catalog = {
  nav: {
    overview: 'Vue d’ensemble',
    dashboard: 'Activité',
    stats: 'Statistiques',
    dispatch: 'Dispatch',
    workOrders: 'Interventions',
    planning: 'Planning',
    field: 'Terrain',
    missions: 'Missions',
    team: 'Techniciens',
    groups: 'Groupes',
    business: 'Business',
    billing: 'Facturation',
    inventory: 'Équipements',
    organization: 'Organisation',
    customers: 'Clients',
    sites: 'Sites',
    categories: 'Catégories',
    settings: 'Paramètres',
  },
  shell: {
    search: 'Rechercher une intervention…',
    searchLabel: 'Recherche globale',
    theme: 'Changer de thème',
    logout: 'Déconnexion',
    menu: 'Navigation principale',
    closeMenu: 'Fermer le menu',
    organization: 'Organisation',
  },
  pub: {
    product: 'Produit',
    faq: 'FAQ',
    login: 'Connexion',
    register: 'Créer une organisation',
    tagline: 'Planning, terrain et facturation pour les PME qui se déplacent.',
    terms: 'Conditions d’utilisation',
    legal: 'Mentions légales',
    portal: 'Portail client Intervenio',
    language: 'Langue',
  },
  home: {
    kicker: 'Logiciel pour équipes terrain',
    title: 'Planifiez la journée, suivez le terrain, facturez le travail fait.',
    lead: 'Intervenio réunit le planning des techniciens, le suivi des interventions et la facturation. Le bureau voit qui part, qui est sur place et ce qui reste à encaisser. Le technicien ouvre sa mission avec l’adresse, la durée et le détail du travail.',
    lead2: 'L’outil est prévu pour les PME qui installent, dépannent et entretiennent, en Europe comme en Afrique. Une journée mélange des tâches d’une heure, de quatre heures et de huit heures, sur plusieurs sites.',
    points: [
      { title: 'Planning', text: 'Chaque technicien a sa colonne, de 8 h à 19 h. Une installation de 4 h, un dépannage d’1 h ou un audit de 8 h se voient tout de suite, sans se chevaucher.' },
      { title: 'Affectation', text: 'Le responsable choisit le technicien, le groupe et, si besoin, le transport. Les missions non affectées restent dans la file, prêtes à être placées.' },
      { title: 'Terrain', text: 'Sur place, le technicien ouvre la fiche : client, site, durée, notes. Le bureau suit l’avancement, du départ jusqu’à la clôture.' },
      { title: 'Facturation', text: 'Le devis et la facture reprennent l’intervention terminée. Le montant à encaisser reste relié au travail réellement fait.' },
    ],
    stories: [
      {
        image: '/brand/technician.jpg',
        alt: 'Technicien relevant une intervention sur tablette, devant un climatiseur.',
        title: 'Le technicien part avec la bonne mission',
        paragraphs: [
          'Avant de quitter le dépôt, il sait où aller, combien de temps prévoir et ce qu’il doit faire. L’adresse, la catégorie et les pièces prévues sont déjà sur la fiche.',
          'Pendant le déplacement, le bureau voit qui est en route, qui est sur place et qui a terminé. Les retards du matin ne se découvrent plus en fin de journée.',
        ],
      },
      {
        image: '/brand/invoice.jpg',
        alt: 'Bureau avec une tablette, un carnet et une calculatrice pour préparer une facture.',
        title: 'La facture suit l’intervention',
        paragraphs: [
          'Quand le travail est clos, le devis ou la facture reprend le client, le site et les lignes du chantier. Plus besoin de ressaisir la prestation dans un autre outil.',
          'Les pièces envoyées, acceptées ou payées restent visibles à côté de l’activité. Vous savez ce qui est fait, et ce qui est encore à encaisser.',
        ],
      },
    ],
    photoAlt: 'Responsable d’exploitation devant son planning, dans un bureau.',
    boardTitle: 'La journée tient sur un seul planning.',
    boardText: 'Trois techniciens, des durées différentes, des sites distincts. Le responsable lit la charge de la journée sans ouvrir chaque fiche.',
    faqTitle: 'Questions fréquentes',
    closeTitle: 'Ouvrez l’espace de votre équipe.',
    closeText: 'Une organisation, vos techniciens, vos clients et le planning du jour. Vous pouvez commencer avec le compte de démonstration ou créer le vôtre.',
  },
  faq: [
    { q: 'À quoi sert Intervenio ?', a: 'Intervenio sert à planifier les interventions, affecter les techniciens et préparer devis et factures dans le même outil.' },
    { q: 'Comment ouvrir un compte ?', a: 'Créez une organisation, puis invitez les responsables et les techniciens. Chaque entreprise a son propre espace.' },
    { q: 'Qui voit les données ?', a: 'Les membres de votre organisation, selon leur rôle. Un technicien voit ses missions. Un responsable voit le planning, les clients et la facturation.' },
    { q: 'Où sont hébergées les données ?', a: 'Le site et l’API sont hébergés chez Render. La base de données est chez Supabase, en Europe (Irlande).' },
    { q: 'Puis-je suivre une intervention sans compte ?', a: 'Oui. Un lien portail peut être envoyé au client pour consulter l’avancement, sans accès au reste de l’organisation.' },
    { q: 'Comment retrouver un accès ?', a: 'Demandez à un responsable de votre organisation. Lui seul peut gérer les comptes de l’équipe.' },
  ],
  auth: {
    loginTitle: 'Connexion',
    loginLead: 'Retrouvez le planning, les interventions et la facturation.',
    email: 'Email',
    emailPlaceholder: 'vous@entreprise.com',
    password: 'Mot de passe',
    signIn: 'Se connecter',
    noAccount: 'Pas encore de compte ?',
    createOrg: 'Créer une organisation',
    loginCaption: 'La journée de l’équipe, avant même d’ouvrir le planning.',
    loginFail: 'Connexion impossible',
    registerTitle: 'Créer votre organisation',
    registerLead: 'Un espace pour vos techniciens, vos clients et vos interventions.',
    firstName: 'Prénom',
    lastName: 'Nom',
    company: 'Entreprise',
    country: 'Pays',
    createAccount: 'Créer mon compte',
    hasAccount: 'Déjà inscrit ?',
    registerCaption: 'Planning, terrain et factures, dès le premier jour.',
    registerFail: 'Inscription impossible',
    loginPhoto: 'Responsable d’exploitation devant son planning, dans un bureau.',
    registerPhoto: 'Technicien relevant une intervention sur tablette, devant un climatiseur.',
  },
  terms: {
    title: 'Conditions d’utilisation',
    updated: 'En vigueur au 9 octobre 2026.',
    sections: [
      { h: 'Objet', p: 'Intervenio est un logiciel de gestion d’interventions : planning, équipes terrain, clients, sites et facturation. Les présentes conditions s’appliquent à toute organisation qui crée un compte.' },
      { h: 'Compte', p: 'L’inscription crée une organisation et un premier utilisateur responsable. Vous êtes responsable des accès que vous donnez à vos collaborateurs, et de la confidentialité des mots de passe.' },
      { h: 'Données de votre organisation', p: 'Les clients, interventions, photos et documents que vous enregistrez restent ceux de votre organisation. Intervenio les traite pour fournir le service : affichage, planning, facturation et lien portail client.' },
      { h: 'Usage acceptable', p: 'Le service ne doit pas servir à stocker des contenus illicites, à usurper l’identité d’un tiers, ni à tenter d’accéder aux données d’une autre organisation.' },
      { h: 'Disponibilité', p: 'Le service est fourni en l’état. Une interruption de maintenance ou d’hébergement peut survenir. Il vous appartient de conserver les pièces dont votre activité a besoin en dehors de l’outil.' },
      { h: 'Fin d’accès', p: 'Vous pouvez cesser d’utiliser Intervenio à tout moment. Un accès peut être suspendu en cas d’usage contraire aux présentes conditions.' },
      { h: 'Contact', p: 'Pour une question sur ces conditions : +237 686 66 91 55 · aicscloud@gmail.com.' },
    ],
  },
  legal: {
    title: 'Mentions légales',
    sections: [
      { h: 'Éditeur', p: 'Intervenio est édité par aicscloud. Téléphone : +237 686 66 91 55. E-mail : aicscloud@gmail.com.' },
      { h: 'Hébergement', p: 'Le site et l’API sont hébergés par Render (render.com). La base de données est hébergée par Supabase (supabase.com), région Europe Ouest, Irlande.' },
      { h: 'Propriété', p: 'Le nom Intervenio, le logo et les textes de présentation sont réservés à l’éditeur. Les données saisies dans une organisation appartiennent à cette organisation.' },
      { h: 'Données personnelles', p: 'Le compte enregistre l’identité des utilisateurs (nom, e-mail) et les informations d’exploitation que l’organisation choisit d’y mettre : clients, sites, interventions, factures. Elles servent uniquement à faire fonctionner l’application. Pour une demande d’accès ou de suppression, écrivez à aicscloud@gmail.com.' },
    ],
  },
};

const en: Catalog = {
  nav: {
    overview: 'Overview',
    dashboard: 'Activity',
    stats: 'Statistics',
    dispatch: 'Dispatch',
    workOrders: 'Jobs',
    planning: 'Schedule',
    field: 'Field',
    missions: 'Missions',
    team: 'Technicians',
    groups: 'Groups',
    business: 'Business',
    billing: 'Billing',
    inventory: 'Equipment',
    organization: 'Organization',
    customers: 'Customers',
    sites: 'Sites',
    categories: 'Categories',
    settings: 'Settings',
  },
  shell: {
    search: 'Search a job…',
    searchLabel: 'Global search',
    theme: 'Switch theme',
    logout: 'Log out',
    menu: 'Main navigation',
    closeMenu: 'Close menu',
    organization: 'Organization',
  },
  pub: {
    product: 'Product',
    faq: 'FAQ',
    login: 'Log in',
    register: 'Create an organization',
    tagline: 'Scheduling, field work and billing for SMEs on the move.',
    terms: 'Terms of use',
    legal: 'Legal notice',
    portal: 'Intervenio customer portal',
    language: 'Language',
  },
  home: {
    kicker: 'Software for field teams',
    title: 'Plan the day, follow the field, bill the work done.',
    lead: 'Intervenio brings the technician schedule, job tracking and billing together. The office sees who has left, who is on site, and what is still to collect. The technician opens the job with the address, the duration and the work detail.',
    lead2: 'Built for SMEs that install, repair and maintain, in Europe and in Africa. A day mixes one-hour, four-hour and eight-hour jobs, across several sites.',
    points: [
      { title: 'Schedule', text: 'Each technician has a column, from 8:00 to 19:00. A 4-hour install, a 1-hour repair or an 8-hour audit show up at once, without overlapping.' },
      { title: 'Dispatch', text: 'The manager picks the technician, the crew and, when needed, the transport. Unassigned jobs stay in the queue, ready to place.' },
      { title: 'Field', text: 'On site, the technician opens the job: customer, site, duration, notes. The office follows progress from departure to close.' },
      { title: 'Billing', text: 'The quote and the invoice follow the finished job. What is left to collect stays tied to the work that was actually done.' },
    ],
    stories: [
      {
        image: '/brand/technician.jpg',
        alt: 'Technician logging a job on a tablet, in front of an air-conditioning unit.',
        title: 'The technician leaves with the right job',
        paragraphs: [
          'Before leaving the depot, they know where to go, how long to plan, and what to do. The address, the category and the expected parts are already on the job.',
          'While they are out, the office sees who is on the way, who is on site and who has finished. Morning delays are no longer discovered at the end of the day.',
        ],
      },
      {
        image: '/brand/invoice.jpg',
        alt: 'Desk with a tablet, a notebook and a calculator for preparing an invoice.',
        title: 'The invoice follows the job',
        paragraphs: [
          'When the work is closed, the quote or the invoice picks up the customer, the site and the job lines. There is no need to retype the work in another tool.',
          'Sent, accepted and paid documents stay next to the activity. You can see what is done, and what is still to collect.',
        ],
      },
    ],
    photoAlt: 'Operations lead at a desk, working through the day’s schedule.',
    boardTitle: 'The day fits on one schedule.',
    boardText: 'Three technicians, different durations, different sites. The manager reads the day’s load without opening every job.',
    faqTitle: 'Common questions',
    closeTitle: 'Open a space for your team.',
    closeText: 'One organization, your technicians, your customers and today’s schedule. Start with the demo account, or create your own.',
  },
  faq: [
    { q: 'What is Intervenio for?', a: 'Intervenio plans jobs, assigns technicians and prepares quotes and invoices in the same tool.' },
    { q: 'How do I open an account?', a: 'Create an organization, then invite managers and technicians. Each company has its own space.' },
    { q: 'Who can see the data?', a: 'Members of your organization, according to their role. A technician sees their jobs. A manager sees the schedule, the customers and the billing.' },
    { q: 'Where is the data hosted?', a: 'The site and the API are hosted on Render. The database is on Supabase, in Europe (Ireland).' },
    { q: 'Can a customer follow a job without an account?', a: 'Yes. A portal link can be sent to the customer to see progress, without access to the rest of the organization.' },
    { q: 'How do I get access back?', a: 'Ask a manager in your organization. Only they can manage the team’s accounts.' },
  ],
  auth: {
    loginTitle: 'Log in',
    loginLead: 'Get back to the schedule, the jobs and the billing.',
    email: 'Email',
    emailPlaceholder: 'you@company.com',
    password: 'Password',
    signIn: 'Log in',
    noAccount: 'No account yet?',
    createOrg: 'Create an organization',
    loginCaption: 'The team’s day, before you even open the schedule.',
    loginFail: 'Could not log in',
    registerTitle: 'Create your organization',
    registerLead: 'A space for your technicians, your customers and your jobs.',
    firstName: 'First name',
    lastName: 'Last name',
    company: 'Company',
    country: 'Country',
    createAccount: 'Create my account',
    hasAccount: 'Already registered?',
    registerCaption: 'Schedule, field and invoices, from day one.',
    registerFail: 'Could not register',
    loginPhoto: 'Operations lead at a desk, working through the day’s schedule.',
    registerPhoto: 'Technician logging a job on a tablet, in front of an air-conditioning unit.',
  },
  terms: {
    title: 'Terms of use',
    updated: 'In effect on 9 October 2026.',
    sections: [
      { h: 'Purpose', p: 'Intervenio is job-management software: scheduling, field teams, customers, sites and billing. These terms apply to every organization that creates an account.' },
      { h: 'Account', p: 'Signing up creates an organization and a first manager. You are responsible for the access you give your staff, and for keeping passwords confidential.' },
      { h: 'Your organization’s data', p: 'Customers, jobs, photos and documents you save stay yours. Intervenio processes them to run the service: display, scheduling, billing and the customer portal link.' },
      { h: 'Acceptable use', p: 'The service must not be used to store illegal content, to impersonate someone else, or to try to reach another organization’s data.' },
      { h: 'Availability', p: 'The service is provided as is. Maintenance or hosting interruptions can happen. Keep the records your business needs outside the tool as well.' },
      { h: 'End of access', p: 'You can stop using Intervenio at any time. Access can be suspended if use breaks these terms.' },
      { h: 'Contact', p: 'Questions about these terms: +237 686 66 91 55 · aicscloud@gmail.com.' },
    ],
  },
  legal: {
    title: 'Legal notice',
    sections: [
      { h: 'Publisher', p: 'Intervenio is published by aicscloud. Phone: +237 686 66 91 55. Email: aicscloud@gmail.com.' },
      { h: 'Hosting', p: 'The site and the API are hosted by Render (render.com). The database is hosted by Supabase (supabase.com), West Europe, Ireland.' },
      { h: 'Ownership', p: 'The name Intervenio, the logo and the presentation copy belong to the publisher. Data entered in an organization belongs to that organization.' },
      { h: 'Personal data', p: 'The account stores user identity (name, email) and the operating information the organization chooses to put in: customers, sites, jobs, invoices. It is used only to run the application. For an access or deletion request, write to aicscloud@gmail.com.' },
    ],
  },
};

export const catalogs: Record<Locale, Catalog> = { fr, en };
