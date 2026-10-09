const columns = [
  {
    name: 'Jean M.',
    jobs: [
      { time: '08:00', title: 'Installation', place: 'Hôtel Akwa', length: '4 h' },
      { time: '13:00', title: 'Contrôle', place: 'Résidence Bonanjo', length: '1 h' },
    ],
  },
  {
    name: 'Amina N.',
    jobs: [
      { time: '08:00', title: 'Dépannage', place: 'Garage Wouri', length: '1 h' },
      { time: '10:00', title: 'Remplacement', place: 'Clinique Bonapriso', length: '1 h' },
    ],
  },
  {
    name: 'Paul K.',
    jobs: [{ time: '08:00', title: 'Audit', place: 'Immeuble Bali', length: '8 h' }],
  },
];

export function ProductBoard() {
  return (
    <div className="board-mock" aria-hidden="true">
      <div className="board-mock-bar">
        <strong>Jeudi 9 octobre</strong>
        <span>5 interventions</span>
      </div>
      <div className="board-mock-cols">
        {columns.map((column) => (
          <section key={column.name}>
            <header>{column.name}</header>
            {column.jobs.map((job) => (
              <article key={`${column.name}-${job.time}`}>
                <time>{job.time}</time>
                <strong>{job.title}</strong>
                <span>{job.place}</span>
                <em>{job.length}</em>
              </article>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
