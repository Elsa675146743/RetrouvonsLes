import { supabase } from './supabase';


const normaliser = (texte: string): string => {
  if (!texte) return '';
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .trim();
};

const mapSexe = (val: string): string => {
  const map: Record<string, string> = {
    'masculin': 'masculin',
    'feminin':  'feminin',
    'inconnu':  'inconnu',
    'm':        'masculin',
    'f':        'feminin',
  };
  return map[normaliser(val)] || 'non_precise';
};

const mapCouleurPeau = (val: string): string => {
  const map: Record<string, string> = {
    'foncee':      'foncee',
    'tres_foncee': 'tres_foncee',
    'claire':      'claire',
    'mate':        'mate',
    'metisse':     'mate',
    'inconnue':    'inconnue',
  };
  return map[normaliser(val)] || 'inconnue';
};

const mapCorpulence = (val: string): string => {
  const map: Record<string, string> = {
    'mince':      'mince',
    'moyenne':    'moyenne',
    'forte':      'forte',
    'athletique': 'athletique',
    'inconnue':   'inconnue',
  };
  return map[normaliser(val)] || 'inconnue';
};

const mapTypeCheveux = (val: string): string => {
  const map: Record<string, string> = {
    'raides':  'raides',
    'lisses':  'raides',
    'frises':  'frises',
    'crepus':  'frises',
    'boucles': 'frises',
    'tresses': 'tresses',
    'courts':  'courts',
    'longs':   'longs',
    'rases':   'rases',
    'autre':   'autre',
  };
  return map[normaliser(val)] || 'autre';
};

const mapTypeIdentification = (val: string): string => {
  const map: Record<string, string> = {
    'cni':              'cni',
    'passeport':        'passeport',
    'acte_naissance':   'acte_naissance',
    'acte_de_naissance':'acte_naissance',
    'aucun':            'aucun',
    'autre':            'autre',
  };
  return map[normaliser(val)] || 'autre';
};

const mapSituationFamiliale = (val: string): string => {
  const map: Record<string, string> = {
    'avec_famille':      'avec_famille',
    'marie':             'avec_famille',
    'mariee':            'avec_famille',
    'orphelin':          'orphelin',
    'orpheline':         'orphelin',
    'separe_famille':    'separe_famille',
    'famille_inconnue':  'famille_inconnue',
    'celibataire':       'autre',
    'vif':               'autre',
    'veuve':             'autre',
    'autre':             'autre',
  };
  return map[normaliser(val)] || 'famille_inconnue';
};


export const getPersonnes = async () => {
  const { data, error } = await supabase
    .from('personne')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};


// FONCTION 2 : Enregistrer une nouvelle personne

export const createPersonne = async (formData: any) => {
  const { data, error } = await supabase
    .from('personne')
    .insert([{
      // --- IDENTITÉ ---
      prenom:                formData.prenom?.trim() || null,
      nom:                   formData.nom?.trim() || null,
      nom_complet:           `${formData.prenom} ${formData.nom}`.trim(),
      alias:                 formData.alias?.trim() || null,
      sexe:                  mapSexe(formData.sexe),
      date_naissance:        formData.dateNaissance || null,
      age_estime_min:        formData.ageMin ? parseInt(formData.ageMin) : null,
      age_estime_max:        formData.ageMax ? parseInt(formData.ageMax) : null,
      nationalite:           formData.nationalite?.trim() || 'Camerounaise',
      langue_parlee:         formData.langue?.trim() || null,
      type_identification:   mapTypeIdentification(formData.typePiece),
      numero_identification: formData.numeroIdentification?.trim() || null,
      situation_familiale:   mapSituationFamiliale(formData.situationFamiliale),
      nombre_enfants:        parseInt(formData.nombreEnfants) || 0,

      // --- PHYSIQUE ---
      description_physique:  formData.description?.trim() || null,
      taille_cm:             formData.taille ? parseInt(formData.taille) : null,
      poids_kg:              formData.poids ? parseInt(formData.poids) : null,
      corpulence:            mapCorpulence(formData.corpulence),
      couleur_peau:          mapCouleurPeau(formData.peau),
      couleur_cheveux:       formData.cheveuxCouleur?.trim() || null,
      type_cheveux:          mapTypeCheveux(formData.cheveuxType),
      couleur_yeux:          formData.yeux?.trim() || null,
      groupe_sanguin:        formData.groupeSanguin !== 'Non connu'
                               ? formData.groupeSanguin
                               : null,
      signes_distinctifs:    formData.signesDistinctifs?.trim() || null,
      handicaps_maladies:    formData.handicaps?.trim() || null,

      // --- COMPLÉMENTS ---
      derniers_vetements_portes: formData.derniersVetements?.trim() || null,
      accessoires:           formData.accessoires?.trim() || null,
      photo_principale:      formData.photo || null,

      // --- MÉTADONNÉES ---
      statut_identite:        'identifie',
      fiabilite_informations: 'probable',
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};