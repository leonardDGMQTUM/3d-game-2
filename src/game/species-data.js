// The Materia Medica: every species the player can catalogue.
// Facts are written to be accurate but compact; see README for sources.
import { BIOME } from '../world/worldgen.js';

export const SPECIES = [
  {
    id: 'foxglove',
    kind: 'plant',
    name: 'Foxglove',
    sci: 'Digitalis purpurea',
    family: 'Plantaginaceae',
    habitat: 'Woodland edges and open grassland',
    hint: 'Tall purple spires near the edge of broadleaf woods.',
    biomes: [BIOME.GRASSLAND, BIOME.FOREST],
    rarity: 0.05,
    reach: 2.6,
    biology:
      'A biennial: it spends its first year as a low rosette of leaves and flowers in its second. The bells all hang from one side of the stem, and the spotted lower lip works as a landing strip that guides bumblebees deep inside.',
    medicine:
      'The genus Digitalis gave medicine its cardiac glycosides: digitoxin from this species, and digoxin from its relative D. lanata. In 1785 the physician William Withering published a careful account of using foxglove for "dropsy" (fluid build-up we now often recognise as heart failure).',
    mechanism:
      'Digoxin inhibits the Na⁺/K⁺-ATPase pump in heart muscle cells. More sodium stays inside, so the Na⁺/Ca²⁺ exchanger removes less calcium, and the extra intracellular Ca²⁺ strengthens each contraction. It also slows conduction through the AV node, which helps control heart rate in atrial fibrillation.',
    caution:
      'Every part of the plant is poisonous. Digoxin has a narrow therapeutic index: the gap between a helpful dose and a toxic one is small.',
  },
  {
    id: 'willow',
    kind: 'plant',
    name: 'White willow',
    sci: 'Salix alba',
    family: 'Salicaceae',
    habitat: 'Riverbanks and wetlands',
    hint: 'A drooping, silvery tree with its feet in wet ground.',
    biomes: [BIOME.WETLAND],
    rarity: 0.05,
    reach: 4.5,
    tree: 0.55,
    biology:
      'Willows are dioecious: each tree is either male or female, and both bear catkins in spring. Cut willow branches root easily, which is why willows quickly colonise riverbanks after floods.',
    medicine:
      'Willow bark has been used for pain and fever since antiquity. In 1763 Edward Stone reported to the Royal Society on willow bark for "agues" (fevers). The bark\'s salicin is turned into salicylic acid in the body, and in 1897 chemists at Bayer made acetylsalicylic acid — aspirin — which is gentler on the stomach.',
    mechanism:
      'Aspirin irreversibly acetylates a serine in the cyclooxygenase enzymes (COX-1 and COX-2), blocking prostaglandin and thromboxane production. Platelets have no nucleus, so they cannot make new COX: one low dose suppresses thromboxane A₂ for the platelet\'s whole 7–10 day life. That is why low-dose aspirin is used to prevent clots.',
    caution: "Aspirin is avoided in children with viral illnesses because of the risk of Reye's syndrome.",
  },
  {
    id: 'yew',
    kind: 'plant',
    name: 'Pacific yew',
    sci: 'Taxus brevifolia',
    family: 'Taxaceae',
    habitat: 'Shady understorey of conifer forests',
    hint: 'A small, dark-needled tree dotted with red "berries", hiding among pines.',
    biomes: [BIOME.CONIFER],
    rarity: 0.06,
    reach: 3.5,
    tree: 0.4,
    biology:
      'The red "berry" is really an aril: a fleshy cup around a single seed. The sweet aril is the one part of the plant that is not toxic; the seed inside is. Birds eat the arils and pass the seeds whole, spreading the tree.',
    medicine:
      'In the 1960s a US National Cancer Institute plant-screening programme collected its bark. Monroe Wall and Mansukh Wani isolated paclitaxel (Taxol) and published its structure in 1971. It is now used against ovarian, breast and lung cancers. Harvesting bark killed these slow-growing trees, so today it is made semi-synthetically from the needles of other yews or by plant cell culture.',
    mechanism:
      'Paclitaxel binds β-tubulin and stabilises microtubules so they cannot disassemble (a mechanism found by Susan Horwitz in 1979). Dividing cells cannot operate their mitotic spindle, so they arrest in mitosis and undergo apoptosis.',
    caution: 'Yew needles and seeds contain taxine alkaloids, which are toxic to the heart.',
  },
  {
    id: 'wormwood',
    kind: 'plant',
    name: 'Sweet wormwood',
    sci: 'Artemisia annua',
    family: 'Asteraceae',
    habitat: 'Dry, open meadows',
    hint: 'A feathery, yellow-green herb that smells sharp and sweet, out on the dry meadows.',
    biomes: [BIOME.MEADOW],
    rarity: 0.06,
    reach: 2.6,
    biology:
      'An annual herb with finely divided, strongly aromatic leaves. Its key compound is made and stored in tiny glandular hairs (trichomes) on the leaves and flowers.',
    medicine:
      'During Project 523, a Chinese research programme begun in 1967, Tu Youyou searched old remedies and found a 4th-century text by Ge Hong that soaked the herb in cold water. Realising heat might destroy the active ingredient, she switched to a low-temperature extraction — leading to artemisinin. She shared the 2015 Nobel Prize in Physiology or Medicine.',
    mechanism:
      'Artemisinin contains an unusual endoperoxide bridge. Inside the malaria parasite, which digests haemoglobin, iron from heme cleaves this bridge and produces reactive radicals that damage many parasite proteins at once.',
    caution: 'It is given in combination therapies (ACTs) so that parasites are less likely to evolve resistance.',
  },
  {
    id: 'periwinkle',
    kind: 'plant',
    name: 'Madagascar periwinkle',
    sci: 'Catharanthus roseus',
    family: 'Apocynaceae',
    habitat: 'Sunny coastal sands',
    hint: 'A low, glossy plant with five-petalled pink flowers, growing on the beach.',
    biomes: [BIOME.BEACH],
    rarity: 0.09,
    reach: 2.6,
    biology:
      'Native to Madagascar, it now grows wild across the tropics. It makes more than 130 different monoterpenoid indole alkaloids — a chemical factory in a small flower.',
    medicine:
      'In the 1950s, researchers tested it as a folk remedy for diabetes. It did not lower blood sugar — instead it lowered white blood cell counts. That clue led Robert Noble and Charles Beer (and teams at Eli Lilly) to vinblastine and vincristine. Vincristine helped transform the treatment of childhood acute lymphoblastic leukaemia; vinblastine is used for Hodgkin lymphoma.',
    mechanism:
      'Vinca alkaloids bind tubulin and stop microtubules from polymerising — the mirror image of paclitaxel, which stops them from depolymerising. Either way, the mitotic spindle fails and dividing cells arrest in metaphase.',
    caution: "Vincristine's dose-limiting side effect is peripheral neuropathy (nerve damage).",
  },
  {
    id: 'penicillium',
    kind: 'fungus',
    name: 'Penicillium mould',
    sci: 'Penicillium rubens',
    family: 'Aspergillaceae',
    habitat: 'Damp, rotting wood in broadleaf woodland',
    hint: 'Blue-green fuzz on a fallen log in the broadleaf woods.',
    biomes: [BIOME.FOREST],
    rarity: 0.05,
    reach: 3,
    biology:
      'The name comes from the Latin penicillus, "paintbrush", after its brush-like spore-bearing structures (conidiophores). Fleming\'s famous strain was long called P. notatum; genome studies reclassified it as P. rubens in 2011.',
    medicine:
      'In 1928 Alexander Fleming noticed a mould contaminating a Staphylococcus culture plate, ringed by a clear zone where the bacteria had died. Around 1940–41, Howard Florey, Ernst Chain and Norman Heatley at Oxford turned it into a usable drug. Fleming, Florey and Chain shared the 1945 Nobel Prize.',
    mechanism:
      "Penicillin's β-lactam ring mimics the D-Ala-D-Ala end of cell-wall building blocks and irreversibly blocks penicillin-binding proteins — the transpeptidases that cross-link peptidoglycan. The bacterial wall weakens and the cell bursts under its own osmotic pressure.",
    caution: 'Many bacteria now make β-lactamase enzymes that cut the β-lactam ring — a major route to antibiotic resistance.',
  },
  {
    id: 'amanita',
    kind: 'fungus',
    name: 'Fly agaric',
    sci: 'Amanita muscaria',
    family: 'Amanitaceae',
    habitat: 'Under birch and pine in conifer forests',
    hint: 'Red caps with white spots on the conifer-forest floor.',
    biomes: [BIOME.CONIFER],
    rarity: 0.06,
    reach: 2.4,
    biology:
      'It is mycorrhizal: its underground threads (hyphae) wrap around tree roots, trading water and minerals for sugars from the tree. The white spots are leftovers of the universal veil that covered the young mushroom.',
    medicine:
      'Muscarine was first isolated from this mushroom in 1869. Although it is only present here in tiny amounts, it gave its name to muscarinic acetylcholine receptors — the receptors of the parasympathetic nervous system, and the target of drugs like atropine.',
    mechanism:
      "The mushroom's actual effects come mostly from ibotenic acid and muscimol. Muscimol is a potent agonist at GABA-A receptors, the same receptor family whose activity benzodiazepines enhance.",
    caution: 'Poisonous. Never eat a wild mushroom you have not had identified by an expert.',
  },
  {
    id: 'cinchona',
    kind: 'plant',
    name: 'Cinchona',
    sci: 'Cinchona officinalis',
    family: 'Rubiaceae',
    habitat: 'Cool, misty mountain slopes',
    hint: 'A glossy-leaved tree with pink flower clusters, high on the cloud slopes.',
    biomes: [BIOME.ALPINE],
    rarity: 0.07,
    reach: 4,
    tree: 0.45,
    biology:
      'Native to Andean cloud forests, it is in the same family as coffee. A cinchona tree appears on the coat of arms of Peru.',
    medicine:
      'Andean peoples knew the bark; Jesuits carried "Jesuit\'s bark" to Europe in the 1600s. In 1820 Pelletier and Caventou isolated quinine, one of the first pure alkaloid drugs. Quinine was the main malaria treatment for centuries. Tonic water still contains a little — which is why it glows under UV light.',
    mechanism:
      'Quinine is thought to stop the parasite turning toxic free heme into harmless hemozoin crystals, so heme builds up and poisons it. Its stereoisomer quinidine is a class Ia antiarrhythmic that blocks cardiac sodium channels.',
    caution: 'High doses cause cinchonism: ringing in the ears, headache and blurred vision.',
  },
  {
    id: 'snowdrop',
    kind: 'plant',
    name: 'Snowdrop',
    sci: 'Galanthus nivalis',
    family: 'Amaryllidaceae',
    habitat: 'High ground near the snowline',
    hint: 'Tiny white nodding flowers among the high rocks, close to the snow.',
    biomes: [BIOME.ROCK, BIOME.ALPINE],
    minHeight: 44,
    rarity: 0.08,
    reach: 2.4,
    biology:
      'Galanthus means "milk flower". It flowers in late winter, sometimes pushing up through snow, with hardened leaf tips that help it break through frozen ground.',
    medicine:
      'In the 1950s, Soviet pharmacologists investigated snowdrops and isolated the alkaloid galantamine. Today it is prescribed for mild-to-moderate Alzheimer\'s disease.',
    mechanism:
      'Galantamine reversibly inhibits acetylcholinesterase, so acetylcholine lingers longer in the synapse. It also positively modulates nicotinic acetylcholine receptors.',
    caution: 'It eases symptoms but does not stop the underlying neurodegeneration.',
  },
  // ---- Animals (observed, not collected) ----
  {
    id: 'deer',
    kind: 'animal',
    name: 'Red deer',
    sci: 'Cervus elaphus',
    family: 'Cervidae',
    habitat: 'Woodland and open grassland',
    hint: 'Large and wary. Walk — don\'t run — and watch from a distance.',
    biology:
      'Only the males (stags) grow antlers, shedding and regrowing them every year. Growing antler is covered in "velvet": skin rich in blood vessels and nerves.',
    medicine:
      'Antler is the only mammalian organ that can fully regenerate. It regrows from stem cells in the pedicle and can lengthen by up to about 2 cm a day, making it a model for studying regeneration and fast, controlled growth that does not become cancer.',
    mechanism:
      'Antlers grow by a modified endochondral ossification: cartilage forms at the growing tip and is progressively replaced by bone. When the velvet is shed, the bone dies and is later cast off.',
  },
  {
    id: 'rabbit',
    kind: 'animal',
    name: 'European rabbit',
    sci: 'Oryctolagus cuniculus',
    family: 'Leporidae',
    habitat: 'Grassland and meadows',
    hint: 'Small and skittish, grazing in open grass.',
    biology:
      'Rabbits practise caecotrophy: they re-eat special soft pellets made in the caecum, which are rich in B vitamins and protein produced by their gut microbes.',
    medicine:
      "Rabbits were central to Louis Pasteur's 1885 rabies vaccine: he weakened the virus by drying infected rabbit spinal cords. They were long used in the pyrogen test for fever-causing contaminants in injectable drugs, now largely replaced by lab tests such as the LAL assay (from horseshoe crab blood) and human-cell assays.",
    mechanism:
      'Their large ears work as radiators: widening the ear blood vessels dumps body heat, and narrowing them saves it.',
  },
  {
    id: 'fox',
    kind: 'animal',
    name: 'Red fox',
    sci: 'Vulpes vulpes',
    family: 'Canidae',
    habitat: 'Woodland edges and open country',
    hint: 'A russet hunter, often about at dusk.',
    biology:
      'The most widespread wild carnivore on Earth. Foxes hear rodents moving under snow and pounce from above; one study found pounces aimed roughly north-east succeeded far more often, hinting that they may use Earth\'s magnetic field.',
    medicine:
      'Red foxes were the main wildlife reservoir of rabies in Europe. Oral vaccine baits, dropped from aircraft since the late 1970s, have eliminated fox rabies from much of western and central Europe.',
    mechanism:
      'Behind the retina sits a tapetum lucidum, a reflective layer that gives light a second pass through the photoreceptors. It improves night vision — and causes eyeshine.',
  },
  {
    id: 'frog',
    kind: 'animal',
    name: 'Common frog',
    sci: 'Rana temporaria',
    family: 'Ranidae',
    habitat: 'Ponds, marshes and wet ground',
    hint: 'Look low, near the water\'s edge in wetlands.',
    biology:
      'It can overwinter at the bottom of ponds, taking in oxygen through its skin (cutaneous respiration) while barely moving.',
    medicine:
      'Its skin secretes antimicrobial peptides called temporins — named after this very species — which are studied as templates for new antibiotics.',
    mechanism:
      'Frog hearts starred in Otto Loewi\'s 1921 experiment: fluid from a vagus-stimulated frog heart slowed a second heart, proving that nerves signal with chemicals. The chemical, "Vagusstoff", was acetylcholine. He shared the 1936 Nobel Prize.',
  },
  {
    id: 'swift',
    kind: 'animal',
    name: 'Common swift',
    sci: 'Apus apus',
    family: 'Apodidae',
    habitat: 'Open skies in daytime',
    hint: 'Look up on a clear day for dark, scythe-winged birds.',
    biology:
      'A swift can stay airborne for about 10 months without landing — eating, drinking and probably sleeping on the wing.',
    medicine:
      'Exactly how swifts sleep is still unknown. Studies of frigatebirds showed that birds can sleep in flight, sometimes with one brain hemisphere at a time (unihemispheric sleep) — something dolphins do too.',
    mechanism:
      'Bird lungs move air in one direction through rigid tubes called parabronchi, pushed by a system of air sacs. Gas exchange happens on both the in-breath and the out-breath — far more efficient than our in-and-out lungs.',
  },
  {
    id: 'firefly',
    kind: 'animal',
    name: 'Common eastern firefly',
    sci: 'Photinus pyralis',
    family: 'Lampyridae',
    habitat: 'Grassland and woodland edges on warm nights',
    hint: 'Wait for nightfall in the grass or woods, then look around you.',
    biology:
      'A beetle, not a fly. Males fly at dusk flashing a J-shaped signal, and females answer from the grass; the timing of the reply identifies the species. Some Photuris females mimic the reply to lure and eat the males.',
    medicine:
      "Its enzyme, firefly luciferase, is one of biology's most-used tools. Researchers attach its gene to genes they want to study, or put it into tumour cells, so activity shows up as light — for example, imaging cancer growth in living mice. It also powers ATP tests that check for bacterial contamination.",
    mechanism:
      'Luciferase oxidises D-luciferin using ATP and oxygen, producing excited oxyluciferin that emits yellow-green light (about 560 nm) with very little heat. Because it needs ATP, the glow doubles as an ATP detector.',
  },
];

export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
export const PLANTS = SPECIES.filter((s) => s.kind !== 'animal');
