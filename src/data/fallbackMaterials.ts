import { Experiment } from '../types';

export const fallbackMaterials: Experiment[] = [
  {
    id: "fb-math-1",
    title: "Understanding BODMAS and Order of Operations",
    keywords: "BODMAS, mathematics, arithmetic, rules, grade 7, maths",
    subject: "Mathematics",
    grade: "7",
    created_at: "2026-05-30T12:00:00Z",
    slides: [
      "BODMAS stands for Brackets, Orders, Division, Multiplication, Addition, Subtraction.",
      "Always solve operations in this precise order from left to right.",
      "Example: 3 + 6 × (5 + 4) ÷ 3. First, Brackets: (5 + 4) = 9. Equation is now: 3 + 6 × 9 ÷ 3.",
      "Second, Division and Multiplication from left to right: 6 × 9 = 54, then 54 ÷ 3 = 18.",
      "Finally, Addition and Subtraction: 3 + 18 = 21."
    ],
    html_content: `
      <h2>Arithmetic Order of Operations: BODMAS</h2>
      <p>In mathematics, the order of operations is a collection of rules that reflect conventions about which procedures to perform first in a given mathematical expression.</p>
      <h3>The BODMAS Rule</h3>
      <ul>
        <li><strong>B</strong> - Brackets first</li>
        <li><strong>O</strong> - Orders (numbers with powers or square roots)</li>
        <li><strong>D/M</strong> - Division and Multiplication (from left to right)</li>
        <li><strong>A/S</strong> - Addition and Subtraction (from left to right)</li>
      </ul>
      <blockquote>Remember: Division and multiplication hold equal priority, so you must resolve them in the order they appear from left to right!</blockquote>
    `
  },
  {
    id: "fb-chem-1",
    title: "Introduction to Atoms & Periodic Table Basics",
    keywords: "atom, chemistry, periodic table, elements, electrons, protons, grade 8",
    subject: "Chemistry",
    grade: "8",
    created_at: "2026-05-30T11:30:00Z",
    slides: [
      "An atom is the basic building block of all matters. It consists of protons, neutrons, and electrons.",
      "The nucleus is at the center of the atom, containing positively charged protons and neutral neutrons.",
      "Negatively charged electrons orbit the nucleus in specific shells or energy levels.",
      "The Periodic Table displays elements sorted by atomic number, which is the number of protons.",
      "Columns are called 'Groups' (similar properties), and rows are called 'Periods'."
    ],
    html_content: `
      <h2>The Basic Structure of an Atom</h2>
      <p>Every physical object is composed of atoms. Atoms are extremely small and are made up of even smaller subatomic particles.</p>
      <h3>Subatomic Particles</h3>
      <table>
        <thead>
          <tr>
            <th>Particle</th>
            <th>Charge</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Proton</td>
            <td>Positive (+1)</td>
            <td>Inside Nucleus</td>
          </tr>
          <tr>
            <td>Neutron</td>
            <td>Neutral (0)</td>
            <td>Inside Nucleus</td>
          </tr>
          <tr>
            <td>Electron</td>
            <td>Negative (-1)</td>
            <td>Outer Shells</td>
          </tr>
        </tbody>
      </table>
    `
  },
  {
    id: "fb-phy-1",
    title: "Force, Friction, and Newton's Three Laws of Motion",
    keywords: "force, friction, newton, laws of motion, physics, grade 9",
    subject: "Physics",
    grade: "9",
    created_at: "2026-05-30T11:00:00Z",
    slides: [
      "A force is a push or pull acting upon an object as a result of its interaction with another object.",
      "Newton's First Law: An object stays at rest or constant velocity unless acted on by external force (Inertia).",
      "Newton's Second Law: Force equals mass times acceleration (F = ma).",
      "Newton's Third Law: For every action, there is an equal and opposite reaction.",
      "Friction is a force that resists relative motion between surfaces in contact."
    ],
    html_content: `
      <h2>Newton's Laws of Motion explained</h2>
      <p>Sir Isaac Newton's three laws of motion describe the relationship between a body and the forces acting upon it, and its motion in response to those forces.</p>
      <h3>Summary of the Laws</h3>
      <ol>
        <li><strong>First Law (Inertia):</strong> If no net force acts on it, an object at rest remains at rest, and an object in motion remains in motion.</li>
        <li><strong>Second Law (F = ma):</strong> The acceleration of an object is directly proportional to the net force acting on it.</li>
        <li><strong>Third Law (Action & Reaction):</strong> When one body exerts a force on a second body, the second body simultaneously exerts a force equal in magnitude and opposite in direction.</li>
      </ol>
    `
  },
  {
    id: "fb-bio-1",
    title: "Human Digestive System: Path of Nutrient Breakdown",
    keywords: "biology, digestive system, human, stomach, intestines, enzymes, grade 7",
    subject: "Biology",
    grade: "7",
    created_at: "2026-05-30T10:30:00Z",
    slides: [
      "Digestion is the breakdown of large insoluble food molecules into small water-soluble molecules.",
      "It starts in the Mouth with mechanical chewing and chemical saliva enzymes (amylase).",
      "Food travels down the Esophagus into the Stomach, where gastric juices split proteins.",
      "In the Small Intestine, nutrients are fully absorbed into the bloodstream with assistance from the liver (bile).",
      "The Large Intestine absorbs water and mineral salts, leaving solid undigested wastes."
    ],
    html_content: `
      <h2>The Human Digestive Track and Organs</h2>
      <p>The human digestive system consists of the gastrointestinal tract plus the accessory organs of digestion (tongue, salivary glands, pancreas, liver, and gallbladder).</p>
      <h3>Digestive Journey</h3>
      <ol>
        <li><strong>Mouth:</strong> Chewing mechanically breaks down food, amylase starts starch breakdown.</li>
        <li><strong>Stomach:</strong> Highly acidic environment with pepsin enzymes to process protein polymers.</li>
        <li><strong>Small Intestine:</strong> Large surface area lined with villi; absorbs vital elements back to cells.</li>
        <li><strong>Large Intestine:</strong> Conserves hydration by recovering fluids and storing remaining fiber.</li>
      </ol>
    `
  },
  {
    id: "fb-soc-1",
    title: "Basic Mapping, Latitude & Longitude Navigation",
    keywords: "latitude, longitude, maps, equator, meridian, social studies, geography, grade 7",
    subject: "Social Studies",
    grade: "7",
    created_at: "2026-05-30T10:00:00Z",
    slides: [
      "Latitude lines (parallels) run east-west around the globe, measuring distance north or south of the Equator.",
      "The Equator is 0 degrees latitude, dividing Earth into Northern and Southern hemispheres.",
      "Longitude lines (meridians) run north-south from pole to pole, measuring distance east or west of the Prime Meridian.",
      "The Prime Meridian is 0 degrees longitude, passing through Greenwich, England.",
      "Any point on Earth can be pinpointed using a pair of coordinate degrees: (Latitude, Longitude)."
    ],
    html_content: `
      <h2>Understanding Coordinates: Latitude & Longitude</h2>
      <p>To identify exact physical positions on Earth, geographers created an imaginary grid system of intersection points called coordinates.</p>
      <h3>Key Reference Markers</h3>
      <ul>
        <li><strong>Equator (0° Latitude):</strong> Midpoint of the planet, warmest regions.</li>
        <li><strong>Prime Meridian (0° Longitude):</strong> Standard marker for calculating Time Zones (GMT/UTC).</li>
        <li><strong>Tropic of Cancer (23.5° N) & Tropic of Capricorn (23.5° S):</strong> Define boundaries of the Tropical Zones.</li>
      </ul>
    `
  },
  {
    id: "math-grade9-logarithms",
    title: "Introduction to Logarithms & Laws of Logarithms",
    keywords: "math, mathematics, logarithms, log, algebra, grade 9",
    subject: "Mathematics",
    grade: "9",
    created_at: "2026-05-30T10:15:00Z",
    html_content: `
      <h2>Introduction to Logarithms</h2>
      <p>A logarithm is the inverse operation of exponentiation. It answers: 'To what power must we raise base b to get number x?'</p>
      <h3>Key Rules & Laws</h3>
      <ul>
        <li><strong>Product Rule:</strong> log_b(xy) = log_b(x) + log_b(y)</li>
        <li><strong>Quotient Rule:</strong> log_b(x/y) = log_b(x) - log_b(y)</li>
        <li><strong>Power Rule:</strong> log_b(x^p) = p * log_b(x)</li>
      </ul>
    `
  },
  {
    id: "agri9-soil-fertility",
    title: "Soil Fertility Management & Crop Rotation",
    keywords: "soil, fertility, crop rotation, agriculture, grade 9, husbandry",
    subject: "Agriculture and Nutrition",
    grade: "9",
    created_at: "2026-06-01T08:00:00Z",
    html_content: `
      <h2>Soil Fertility Management & Crop Rotation</h2>
      <p>Soil fertility is the capability of soil to sustain agricultural plant growth. Legumes and proper crop rotational cycles keep our ecosystems healthy without harmful synthetic additives.</p>
      <h3>Dynamic Cycles</h3>
      <ul>
        <li><strong>Nitrogen Fixers:</strong> Leguminous plants fix atmospheric nitrogen.</li>
        <li><strong>Heavy Feeders:</strong> Maize and sorghum extract massive nitrogen.</li>
        <li><strong>Pest Break:</strong> Rotating families breaks insect cycles.</li>
      </ul>
    `
  },
  {
    id: "agri9-nutrition-diet",
    title: "Essential Nutrient Profiles & Human Diets",
    keywords: "nutrition, balanced diet, proteins, carbohydrates, grade 9, food",
    subject: "Agriculture and Nutrition",
    grade: "9",
    created_at: "2026-06-01T09:30:00Z",
    html_content: `
      <h2>Essential Nutrient Profiles</h2>
      <p>Nutrition explores chemical processes converting dietary compounds into growth and active energy. Standard balance requires macronutrients alongside micronutrient protective agents.</p>
      <h3>Macro Elements</h3>
      <ul>
        <li><strong>Carbohydrates:</strong> Energy delivery mechanism.</li>
        <li><strong>Proteins:</strong> Muscle structures and cell restoration.</li>
        <li><strong>Vitamins and Minerals:</strong> Natural systemic immunity shields.</li>
      </ul>
    `
  },
  {
    id: "agri9-vertical-gardens",
    title: "Vertical Gardening Techniques for Micro-Nutrition",
    keywords: "vertical gardening, sacks, plastic bottles, kitchen garden, grade 9",
    subject: "Agriculture and Nutrition",
    grade: "9",
    created_at: "2026-06-01T11:00:00Z",
    html_content: `
      <h2>Vertical Gardening</h2>
      <p>Vertical gardening involves growing crops vertically on wall mounts, multi-tier crates, or upright sacks. It is perfect for modern backyard areas with limited floor space.</p>
      <h3>Excellent Advantages</h3>
      <ul>
        <li><strong>Space Maximization:</strong> Minimal base area required.</li>
        <li><strong>Conservation:</strong> Dramatic drop in irrigation run-off.</li>
        <li><strong>Accessibility:</strong> Simple upkeep and harvesting postures.</li>
      </ul>
    `
  },
  {
    id: "art9-outdoor-sketching",
    title: "Outdoor Sketching and Perspective Texturing",
    keywords: "perspective, shading, sketching, art, grade 9, landscape",
    subject: "Creative Arts and Sports",
    grade: "9",
    created_at: "2026-06-02T08:00:00Z",
    html_content: `
      <h2>Perspective and Shading in Landscape Art</h2>
      <p>Perspective drawing simulates depth on a flat sheet of paper. Linear perspective uses a vanishing point on the horizon line so parallel elements seem to merge securely.</p>
      <h3>Core Drafting Principles</h3>
      <ul>
        <li><strong>Horizon Line:</strong> Represents the eye level of the painter.</li>
        <li><strong>Vanishing Point:</strong> The point where parallel receding lines converge.</li>
        <li><strong>Cross-Hatching:</strong> Intersecting shading strokes that create intense shadow volumes.</li>
      </ul>
    `
  },
  {
    id: "art9-music-notation",
    title: "Basic Music Staff Notation & Treble Clef Scales",
    keywords: "music, notation, treble clef, staff, pitch, grade 9",
    subject: "Creative Arts and Sports",
    grade: "9",
    created_at: "2026-06-02T09:30:00Z",
    html_content: `
      <h2>The Musical Staff and Treble Clef Pitch</h2>
      <p>Music notation is a global graphical language representing duration and frequency pitch. Symbols are laid directly across the five structural lines and four spaces of the staff.</p>
      <h3>Key Symbolic Frameworks</h3>
      <ul>
        <li><strong>Treble Clef (G Clef):</strong> Circles the second line of the staff, designating it as G4.</li>
        <li><strong>Ledger Lines:</strong> Short temporary dashes supporting pitches extending higher or lower than the main staff.</li>
        <li><strong>Accidentals:</strong> Sharps (#) and flats (b) that raise or lower standard interval pitches by semitones.</li>
      </ul>
    `
  },
  {
    id: "art9-athletics-training",
    title: "Track Athletics & Optimal Aerobic Conditioning",
    keywords: "athletics, running, aerobic, training, fitness, grade 9, sports",
    subject: "Creative Arts and Sports",
    grade: "9",
    created_at: "2026-06-02T11:00:00Z",
    html_content: `
      <h2>Pacing and Energy Channels in Track Athletics</h2>
      <p>Athletic sports demand a clear synergy of anaerobic burst actions and long-duration aerobic pathways. Safe progression hinges on correct stride postures and joint alignments.</p>
      <h3>Conditioning Elements</h3>
      <ul>
        <li><strong>Aerobic Endurance:</strong> Slower, oxygenated cardiovascular exercise like steady distance jogging.</li>
        <li><strong>Anaerobic Speed:</strong> Short, high-intensity sprint sets relying on localized phosphator and glycogen ATP.</li>
        <li><strong>Baton Handover:</strong> Relays require smooth visual or non-visual exchange techniques inside passing zones.</li>
      </ul>
    `
  }
];
