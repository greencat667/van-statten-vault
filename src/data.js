// Facts, layout and documentation. Confidence vocabulary used everywhere:
//   confirmed  – seen or said on screen in "Dalek" (2005)
//   production – documented by the production (DWM Fact File, BBC material)
//   inferred   – reconstructed by cross-referencing several stills
//   speculative – not established; a conservative stand-in
export const CONF = {
  confirmed: { label: 'Screen-confirmed', color: '#6fbf73' },
  production: { label: 'Production-documented', color: '#7fb2e5' },
  inferred: { label: 'Inferred from stills', color: '#e0b84f' },
  speculative: { label: 'Speculative', color: '#d9775c' },
  imaginative: { label: 'Imaginative (Expanded Vault)', color: '#b28fe0' },
};

// Gallery dimensions in metres. x across, z along (−z towards the arch).
export const ROOM = {
  halfW: 4.8, halfL: 12, height: 4.8,
  runnerHalfW: 1.45,
  pilasterZ: [10, 6, 2, -2, -6, -10], pilasterW: 0.7, pilasterD: 0.45,
  arch: { halfW: 2.3, spring: 2.1, z: -12, bayDepth: 5, bayHalfW: 3.0 },
  doors: [
    { id: 'main', wall: 'near', x: 0, z: 12, w: 2.0, h: 2.6 },
    { id: 'west', wall: 'left', x: -4.8, z: 4, w: 1.7, h: 2.5 },
    { id: 'east', wall: 'right', x: 4.8, z: 0, w: 1.7, h: 2.5 },
  ],
  lightSwitch: { x: 4.79, y: 1.35, z: -6.9 },
};

export const TARDIS_POS = { x: 1.35, z: -9.3, rotY: -0.18 };

// Every exhibit. case: vitrine | tall | slim | wall | pedestal | low
export const EXHIBITS = [
  {
    id: 'cyberman', name: 'Cyberman head', short: 'Cyberman head',
    case: 'tall', pos: [-4.33, -8.0], rotY: Math.PI / 2,
    classification: 'Cybernetic armour, cranial unit (Mondasian/Telosian pattern)',
    provenance: 'Plaque reportedly reads "found in the London sewers, 1977" (fan reading of the on-screen card; illegible at broadcast resolution).',
    func: 'Helmet of a Cyberman: life support, sensors and the top-mounted head weapon.',
    condition: 'Inert. The Doctor: "stone dead". Silver finish dulled, cabling trailing from the neck ring.',
    notes: 'The design follows "Revenge of the Cybermen" (1975): corrugated handlebar tubes, a rounded faceplate with round eyes and a slot mouth, a lamp disc on top. Executive producer Julie Gardner asked for a Cyberman to be added to the script. Touching this case sets off the alarm.',
    evidence: [
      ['confirmed', 'Named and touched on screen; design seen in close-up (front and three-quarter).'],
      ['production', 'Gardner requested the Cyberman (DWM Fact File via Shannon Sullivan).'],
      ['inferred', 'Case stands against a terracotta wall bay; exact bay inferred from the reverse angle.'],
    ],
    confidence: 'confirmed', posConf: 'inferred', alarm: true,
  },
  {
    id: 'slitheen', name: 'Stuffed Slitheen arm', short: 'Slitheen arm',
    case: 'vitrine', pos: [-1.95, -3.8], rotY: Math.PI / 2,
    classification: 'Biological specimen, Raxacoricofallapatorian forelimb (taxidermy)',
    provenance: 'Not stated. The Slitheen visited London in 2006 ("Aliens of London"/"World War Three").',
    func: 'None: a preserved limb.',
    condition: 'Stuffed and mounted upright on a block; skin dried and slightly shrunken at the knuckles.',
    notes: 'Rose identifies it: "a Slitheen\'s arm. It\'s been stuffed." In the wide shot it stands upright, claws to the sky, in the nearest left-hand case.',
    evidence: [
      ['confirmed', 'Named by Rose; visible in the wide gallery shot (front-left case).'],
      ['inferred', 'Hand detail, skin mottling and mount reconstructed from the wide shot only.'],
    ],
    confidence: 'confirmed', posConf: 'confirmed',
  },
  {
    id: 'meteorite', name: 'Meteorite chunk', short: 'Meteorite',
    case: 'vitrine', pos: [-1.95, -6.4], rotY: Math.PI / 2,
    classification: 'Geological specimen, iron-stony meteorite (fusion-crusted)',
    provenance: 'Not stated.',
    func: 'None.',
    condition: 'Fusion crust intact on most faces; one cut face polished to show metal grains.',
    notes: 'The Doctor names "chunks of meteorite" in his first sweep of the room. A dark, lumpy rock sits in the second left-hand case in the wide shot; identifying it as the meteorite is an inference.',
    evidence: [
      ['confirmed', 'Meteorite chunks named in dialogue.'],
      ['inferred', 'Matched to the dark rock in the second left case of the wide shot.'],
    ],
    confidence: 'confirmed', posConf: 'inferred',
  },
  {
    id: 'meteorites', name: 'Meteorite fragments', short: 'Meteorite fragments',
    case: 'wall', pos: [-4.45, 8.0], rotY: Math.PI / 2,
    classification: 'Geological specimens, assorted meteorites with sample containers',
    provenance: 'Not stated.',
    func: 'None.',
    condition: 'Catalogued fragments on brass specimen stands; small pieces in lidded containers.',
    notes: 'Supporting display for the "chunks of meteorite" line. The arrangement and the wall case are conservative museum practice, not screen evidence.',
    evidence: [
      ['confirmed', 'Meteorites named in dialogue.'],
      ['speculative', 'This wall case and its layout are not seen on screen.'],
    ],
    confidence: 'confirmed', posConf: 'speculative',
  },
  {
    id: 'moondust', name: 'Moon dust', short: 'Moon dust',
    case: 'vitrine', pos: [1.95, -3.4], rotY: -Math.PI / 2,
    classification: 'Geological specimen, lunar regolith',
    provenance: 'Not stated (Apollo-era sample is the obvious reading).',
    func: 'None.',
    condition: 'Sealed glass sample jar with a nitrogen-purge valve; fine grey powder.',
    notes: 'Named by the Doctor straight after the meteorites. Shown here as a scientific sample, not a glowing substance. Position and container are speculative.',
    evidence: [
      ['confirmed', 'Named in dialogue.'],
      ['speculative', 'Container, display and position are not seen clearly on screen.'],
    ],
    confidence: 'confirmed', posConf: 'speculative',
  },
  {
    id: 'milometer', name: 'Milometer from the Roswell spaceship', short: 'Roswell milometer',
    case: 'vitrine', pos: [1.95, 0.0], rotY: -Math.PI / 2,
    classification: 'Alien technology, navigational odometer (salvage)',
    provenance: 'Roswell, New Mexico, 1947 (per the Doctor). Van Statten later credits Roswell technology for broadband.',
    func: 'Records distance travelled. The Doctor\'s identification.',
    condition: 'Housing dented; drum counters seized; severed conduit stubs.',
    notes: 'Named by the Doctor. No close shot shows it clearly, so this model is a conservative instrument: a cast housing, an oddly proportioned drum counter and a mounting cradle. It is deliberately not a car dashboard or speedometer.',
    evidence: [
      ['confirmed', 'Named in dialogue.'],
      ['speculative', 'Its appearance and position are not established; this is a stand-in.'],
    ],
    confidence: 'confirmed', posConf: 'speculative',
  },
  {
    id: 'ribbed', name: 'Black ribbed carapace', short: 'Ribbed carapace',
    case: 'vitrine', pos: [1.95, -6.9], rotY: -Math.PI / 2,
    classification: 'Biological specimen, unidentified (exoskeletal cranium?)',
    provenance: 'Unknown.',
    func: 'Unknown.',
    condition: 'Glossy black, ribbed, apparently dry.',
    notes: 'Visible in the right foreground of the wide gallery shot. Fans often read it as a nod to the Alien films; the episode never names it.',
    evidence: [
      ['confirmed', 'Visible on screen (wide shot, right foreground).'],
      ['inferred', 'Shape reconstructed from a partial, out-of-focus view.'],
    ],
    confidence: 'confirmed', posConf: 'confirmed',
  },
  {
    id: 'egg', name: 'Ovoid specimen ("the egg")', short: 'The egg',
    case: 'slim', pos: [-0.55, -10.7], rotY: 0.4,
    classification: 'Biological specimen, unidentified ovoid',
    provenance: 'Unknown.',
    func: 'Unknown.',
    condition: 'Leathery, closed lobes at the crown.',
    notes: 'A tall slim case near the arch holds an egg-shaped object. The TARDIS wiki calls it a Xenomorph egg, behind and to the left of the TARDIS. That identification is a fan reading.',
    evidence: [
      ['confirmed', 'Tall case with an ovoid object visible near the arch (wide shot and behind-the-scenes footage).'],
      ['inferred', 'Lobed crown and texture reconstructed; identification is fan-sourced.'],
    ],
    confidence: 'confirmed', posConf: 'inferred',
  },
  {
    id: 'primate', name: 'Primate head bust', short: 'Primate head',
    case: 'pedestal', pos: [4.2, -8.8], rotY: -Math.PI / 2,
    classification: 'Biological specimen or cast, unidentified (ape-like)',
    provenance: 'Unknown. The TARDIS wiki lists an "ape-man head".',
    func: 'None.',
    condition: 'Brown, matt.',
    notes: 'A brown, ape-like head is visible over Rose\'s shoulder in the reverse angle from inside the Cyberman case. Placing it across the gallery from the Cyberman follows from that angle.',
    evidence: [
      ['confirmed', 'Partially visible on screen (reverse angle).'],
      ['inferred', 'Position derived from the reverse angle; the face is mostly unseen.'],
    ],
    confidence: 'confirmed', posConf: 'inferred',
  },
  {
    id: 'weapons', name: 'Alien weapons', short: 'Alien weapons',
    case: 'wall', pos: [4.45, 8.0], rotY: -Math.PI / 2,
    classification: 'Alien technology, small arms',
    provenance: 'Van Statten\'s collection (the "Gray Market" in tie-in prose).',
    func: 'Weapons. Goddard notes the Dalek is "between us and the weapons"; the Doctor later arms himself from the collection.',
    condition: 'Untested.',
    notes: 'The dialogue confirms that weapons are kept in the collection. Where they are kept, and what they look like, is not shown in this room.',
    evidence: [
      ['confirmed', 'Weapons in the collection mentioned in dialogue.'],
      ['speculative', 'Display and designs are stand-ins.'],
    ],
    confidence: 'confirmed', posConf: 'speculative',
  },
  {
    id: 'hull', name: 'Spacecraft hull fragment', short: 'Hull fragment',
    case: 'vitrine', pos: [-1.95, -0.6], rotY: Math.PI / 2,
    classification: 'Alien technology, structural plating',
    provenance: 'Not stated.',
    func: 'Hull plate, about an inch thick.',
    condition: 'Torn edges, heat discolouration.',
    notes: 'A piece of spaceship hull appears in Adam\'s workshop, not in this gallery. It stands in for the indistinct objects in the further left-hand cases of the wide shot.',
    evidence: [
      ['confirmed', 'Hull fragment seen in the episode (workshop scene).'],
      ['speculative', 'Placement in this gallery case is a stand-in.'],
    ],
    confidence: 'confirmed', posConf: 'speculative',
  },
  {
    id: 'indistinct', name: 'Indistinct objects', short: 'Indistinct objects',
    case: 'low', pos: [-3.15, -9.75], rotY: Math.PI / 2,
    classification: 'Unknown',
    provenance: 'Unknown.',
    func: 'Unknown.',
    condition: 'Unknown.',
    notes: 'Low cases near the arch hold objects too dark to identify in the wide shot. They are shown as soft dark forms on purpose, rather than invented artefacts.',
    evidence: [['confirmed', 'Low cases with dark contents visible near the arch.'], ['speculative', 'Contents unidentifiable.']],
    confidence: 'speculative', posConf: 'inferred',
  },
  // Expanded Vault — imaginative reconstructions only.
  {
    id: 'auton', name: 'Auton hand', short: 'Auton hand', expanded: true,
    case: 'pedestal', pos: [-4.2, 0.0], rotY: Math.PI / 2,
    classification: 'Nestene Consciousness, plastic duplicate (hand with concealed gun)',
    provenance: 'Imaginative: the Autons attacked London in 1970 and 2005 ("Spearhead from Space", "Rose").',
    func: 'Wrist-hinged energy weapon.', condition: 'Inert plastic.',
    notes: 'Not in the episode. Added for the Expanded Vault as a plausible Van Statten acquisition before 2012.',
    evidence: [['imaginative', 'Not in "Dalek". Imaginative reconstruction.']],
    confidence: 'imaginative', posConf: 'imaginative',
  },
  {
    id: 'nestene', name: 'Nestene energy unit', short: 'Energy unit', expanded: true,
    case: 'pedestal', pos: [4.2, 4.0], rotY: -Math.PI / 2,
    classification: 'Nestene technology, energy-unit sphere',
    provenance: 'Imaginative: Nestene energy units fell to Earth in "Spearhead from Space" (1970).',
    func: 'Containment for part of the Nestene Consciousness.', condition: 'Dormant.',
    notes: 'Not in the episode. Imaginative reconstruction.',
    evidence: [['imaginative', 'Not in "Dalek". Imaginative reconstruction.']],
    confidence: 'imaginative', posConf: 'imaginative',
  },
  {
    id: 'sontaran', name: 'Sontaran helmet', short: 'Sontaran helmet', expanded: true,
    case: 'pedestal', pos: [-1.95, 2.6], rotY: Math.PI / 2,
    classification: 'Sontaran military armour, battle helmet (classic pattern)',
    provenance: 'Imaginative.', func: 'Head armour with a probic-vent collar.', condition: 'Scuffed.',
    notes: 'Not in the episode. Imaginative reconstruction.',
    evidence: [['imaginative', 'Not in "Dalek". Imaginative reconstruction.']],
    confidence: 'imaginative', posConf: 'imaginative',
  },
  {
    id: 'ood', name: 'Ood translator sphere', short: 'Translator sphere', expanded: true,
    case: 'pedestal', pos: [1.95, 3.2], rotY: -Math.PI / 2,
    classification: 'Ood Operations technology, translation device',
    provenance: 'Imaginative: the Ood are first seen in 2006 ("The Impossible Planet") in the 42nd century, so this would be an anachronism Van Statten could not explain.',
    func: 'Translates Ood telepathy into speech.', condition: 'Cable frayed.',
    notes: 'Not in the episode. Imaginative reconstruction.',
    evidence: [['imaginative', 'Not in "Dalek". Imaginative reconstruction.']],
    confidence: 'imaginative', posConf: 'imaginative',
  },
];

// Things in the room that are not exhibits, for the plan and the summary.
export const FEATURES = [
  { name: 'Central mustard carpet runner', conf: 'confirmed' },
  { name: 'Grey carpet borders under the cases', conf: 'confirmed' },
  { name: 'Orange-ochre square pilasters', conf: 'confirmed' },
  { name: 'Terracotta panelled wall bays', conf: 'confirmed' },
  { name: 'Round-headed arch with black drapes beyond', conf: 'confirmed' },
  { name: 'Sign above the arch (content unknown)', conf: 'inferred' },
  { name: 'Room length and width', conf: 'inferred' },
  { name: 'Ceiling, beams and track lights', conf: 'speculative' },
  { name: 'Door positions and security shutters', conf: 'speculative' },
  { name: 'Light switch position', conf: 'speculative' },
];

// Floor-plan regions for the overlay. Rects are [x0, z0, x1, z1].
export const PLAN = [
  { conf: 'confirmed', label: 'Runner + case rows (V1)', rect: [-3.2, -10.5, 3.2, -3.5] },
  { conf: 'inferred', label: 'Arch end + TARDIS bay', rect: [-3.0, -17, 3.0, -10.5] },
  { conf: 'inferred', label: 'Cyberman bay (V2/V4)', rect: [-4.8, -10, -3.2, -6] },
  { conf: 'speculative', label: 'Near half, doors', rect: [-4.8, -3.5, 4.8, 12] },
  { conf: 'speculative', label: 'Right bays', rect: [3.2, -10.5, 4.8, -3.5] },
];

// Guided tour: camera position, look-at target and caption.
export const TOUR = [
  { title: 'Arrival', pos: [0.6, 1.62, -5.6], look: [1.3, 1.4, -9.3], text: 'The TARDIS lands in the dark at the arch end of the gallery: Utah, half a mile underground, 2012. The Doctor finds a light switch and the collection appears.', light: 'dark' },
  { title: 'The gallery', pos: [-0.682, 1.409, -0.862], look: [-1.15, 0.49, -8.79], text: 'The wide shot: a mustard runner between two rows of navy and beech vitrines, orange pilasters, terracotta bays and the arch beyond. This view is the main reference camera.', light: 'lit' },
  { title: 'Chunks of meteorite', exhibit: 'meteorite', text: 'The Doctor\'s first identification. The dark rock in the second left case matches the line.' },
  { title: 'Moon dust', exhibit: 'moondust', text: 'Named next. Shown as a sealed lunar sample; its position is speculative.' },
  { title: 'The Roswell milometer', exhibit: 'milometer', text: '"The milometer off the Roswell spaceship." Only the dialogue survives; the model is a conservative stand-in.' },
  { title: 'A stuffed Slitheen arm', exhibit: 'slitheen', text: 'Rose\'s find, upright in the nearest left case. Taxidermy, not a living creature.' },
  { title: 'The ribbed carapace', exhibit: 'ribbed', text: 'Visible on screen but never named: black and ribbed, in the right foreground of the wide shot.' },
  { title: 'The egg', exhibit: 'egg', text: 'In the tall slim case near the arch. Fans call it a Xenomorph egg; the episode does not.' },
  { title: 'Cyberman head', exhibit: 'cyberman', text: '"The stuff of nightmares, reduced to an exhibit." The Revenge of the Cybermen design. The Doctor touches the glass, and the alarm goes off.' },
];
