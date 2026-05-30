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
  }
];
