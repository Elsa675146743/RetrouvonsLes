import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, StatusBar, ActivityIndicator,
  Alert, Image
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { supabase } from '../../../services/supabase';

const ONGLETS = [
  { key: 'informations',  label: 'Informations',  icon: 'information-circle-outline' },
  { key: 'photos',        label: 'Photos',        icon: 'camera-outline'             },
  { key: 'signalements',  label: 'Signalements',  icon: 'flag-outline'               },
  { key: 'localisations', label: 'Localisations', icon: 'location-outline'           },
  { key: 'documents',     label: 'Documents',     icon: 'document-text-outline'      },
  { key: 'filiation',     label: 'Filiation',     icon: 'people-outline'             },
  { key: 'historique',    label: 'Historique',    icon: 'time-outline'               },
  { key: 'analyseIA',     label: 'Analyse IA',    icon: 'hardware-chip-outline'      },
];

// ── Info Row ──────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={oStyles.infoRow}>
      <Ionicons name={icon as any} size={13} color="#94a3b8" />
      <View style={{ flex: 1 }}>
        <Text style={oStyles.infoLabel}>{label}:</Text>
        <Text style={oStyles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

// ── Onglet Informations ───────────────────────────────────────
function OngletInformations({ dossier, navigation }: { dossier: any; navigation: any }) {
  if (!dossier) return null;
  const p = dossier.personne || {};
  return (
    <ScrollView contentContainerStyle={oStyles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={oStyles.grid}>
        <View style={oStyles.card}>
          <View style={oStyles.cardHeader}>
            <Ionicons name="document-text-outline" size={16} color="#1e293b" />
            <Text style={oStyles.cardTitle}>Informations de Disparition</Text>
          </View>
          <InfoRow icon="time-outline"     label="Date Disparition" value={dossier.date_disparition ? new Date(dossier.date_disparition).toLocaleDateString('fr-FR') : '—'} />
          <InfoRow icon="location-outline" label="Lieu Disparition"  value={`${dossier.lieu_disparition || '—'}${dossier.pays_disparition ? ', ' + dossier.pays_disparition : ''}`} />
          <InfoRow icon="document-outline" label="Circonstances"     value={dossier.circonstances || 'Non précisées'} />
          <InfoRow icon="help-outline"     label="Type Disparition"  value={dossier.type_disparition || 'Inconnue'} />
        </View>

        <View style={oStyles.card}>
          <View style={oStyles.cardHeader}>
            <Ionicons name="person-outline" size={16} color="#1e293b" />
            <Text style={oStyles.cardTitle}>Informations Personne</Text>
          </View>
          <InfoRow icon="person-outline"      label="Nom complet"       value={p.nom_complet || `${p.prenom || ''} ${p.nom || ''}`.trim() || '—'} />
          <InfoRow icon="time-outline"        label="Date de naissance" value={p.date_naissance ? new Date(p.date_naissance).toLocaleDateString('fr-FR') : '—'} />
          <InfoRow icon="male-female-outline" label="Sexe"              value={p.sexe || '—'} />
        </View>

        <View style={oStyles.card}>
          <View style={oStyles.cardHeader}>
            <Ionicons name="person-outline" size={16} color="#1e293b" />
            <Text style={oStyles.cardTitle}>Contact & Responsables</Text>
          </View>
          <InfoRow icon="search-outline" label="Enquêteur"       value={dossier.enqueteur || 'Non assigné'} />
          <InfoRow icon="person-outline" label="Contact Famille" value={dossier.contact_famille_principale || '—'} />
          <InfoRow icon="call-outline"   label="Téléphone"       value={dossier.telephone_contact || '—'} />
          <InfoRow icon="mail-outline"   label="Email"           value={dossier.email_contact || '—'} />
        </View>

        <View style={oStyles.card}>
          <View style={oStyles.cardHeader}>
            <Ionicons name="bar-chart-outline" size={16} color="#1e293b" />
            <Text style={oStyles.cardTitle}>Statistiques</Text>
          </View>
          <View style={oStyles.statsGrid}>
            <View style={oStyles.statBox}>
              <Text style={oStyles.statNum}>0</Text>
              <Text style={oStyles.statLabel}>Signalements</Text>
            </View>
            <View style={oStyles.statBox}>
              <Text style={oStyles.statNum}>0</Text>
              <Text style={oStyles.statLabel}>Alertes</Text>
            </View>
            <View style={[oStyles.statBox, { borderBottomWidth: 0 }]}>
              <Text style={[oStyles.statNum, { color: '#2563eb' }]}>0</Text>
              <Text style={oStyles.statLabel}>Vues Fiche</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={oStyles.actionsRow}>
        <TouchableOpacity style={oStyles.btnAction} onPress={() => navigation.navigate('ModifierDossierPage', { dossierId: dossier.id })}>
          <Ionicons name="create-outline" size={16} color="#FFF" />
          <Text style={oStyles.btnActionText}>Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[oStyles.btnAction, { backgroundColor: '#f59e0b' }]} onPress={() => navigation.navigate('CreerAlertePage', { dossierId: dossier.id })}>
          <Ionicons name="notifications-outline" size={16} color="#FFF" />
          <Text style={oStyles.btnActionText}>Créer Alerte</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[oStyles.btnAction, { backgroundColor: '#8b5cf6' }]}>
          <Ionicons name="hardware-chip-outline" size={16} color="#FFF" />
          <Text style={oStyles.btnActionText}>Analyse IA</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ── Onglet Photos ─────────────────────────────────────────────
function OngletPhotos({ dossierId }: { dossierId: string }) {
  return (
    <View style={oStyles.scrollContent}>
      <View style={oStyles.sectionHeader}>
        <Ionicons name="camera-outline" size={18} color="#1e293b" />
        <Text style={oStyles.sectionTitle}>Photos</Text>
      </View>
      <View style={oStyles.emptyBox}>
        <Ionicons name="camera-outline" size={40} color="#cbd5e1" />
        <Text style={oStyles.emptyText}>Aucune photo</Text>
      </View>
    </View>
  );
}

// ── Onglet Signalements ───────────────────────────────────────
function OngletSignalements({ dossierId }: { dossierId: string }) {
  return (
    <View style={oStyles.scrollContent}>
      <View style={oStyles.sectionHeader}>
        <Ionicons name="flag-outline" size={18} color="#1e293b" />
        <Text style={oStyles.sectionTitle}>Signalements</Text>
      </View>
      <View style={oStyles.emptyBox}>
        <Ionicons name="flag-outline" size={40} color="#cbd5e1" />
        <Text style={oStyles.emptyText}>Aucun signalement</Text>
      </View>
    </View>
  );
}

// ── Onglet Localisations ──────────────────────────────────────
function OngletLocalisations({ dossierId }: { dossierId: string }) {
  return (
    <View style={oStyles.scrollContent}>
      <View style={oStyles.sectionHeader}>
        <Ionicons name="location-outline" size={18} color="#1e293b" />
        <Text style={oStyles.sectionTitle}>Localisations</Text>
      </View>
      <View style={oStyles.emptyBox}>
        <Ionicons name="location-outline" size={40} color="#cbd5e1" />
        <Text style={oStyles.emptyText}>Aucune localisation</Text>
      </View>
    </View>
  );
}

// ── Onglet Documents ──────────────────────────────────────────
function OngletDocuments({ dossierId }: { dossierId: string }) {
  const [typeDoc, setTypeDoc]           = useState('rapport_police');
  const [description, setDescription]   = useState('');
  const [confidentiel, setConfidentiel]  = useState(true);
  const [fichierNom, setFichierNom]      = useState('');
  const [uploading, setUploading]        = useState(false);

  const typeOptions = [
    { label: 'Rapport de police',  value: 'rapport_police'  },
    { label: 'Témoignage',         value: 'temoignage'      },
    { label: "Pièce d'identité",   value: 'piece_identite'  },
    { label: 'Rapport médical',    value: 'rapport_medical' },
    { label: 'Autre',              value: 'autre'           },
  ];

  return (
    <ScrollView contentContainerStyle={oStyles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={oStyles.sectionHeader}>
        <Ionicons name="document-text-outline" size={18} color="#1e293b" />
        <Text style={oStyles.sectionTitle}>Documents</Text>
      </View>

      <View style={oStyles.formCard}>
        <View style={oStyles.formRow}>
          <View style={oStyles.formHalf}>
            <Text style={oStyles.formLabel}>Type</Text>
            <View style={oStyles.pickerBox}>
              {typeOptions.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[oStyles.selectChip, typeDoc === opt.value && oStyles.selectChipActive]}
                  onPress={() => setTypeDoc(opt.value)}
                >
                  <Text style={[oStyles.selectChipText, typeDoc === opt.value && oStyles.selectChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={oStyles.formHalf}>
            <Text style={oStyles.formLabel}>Fichier</Text>
            <TouchableOpacity
              style={oStyles.filePicker}
              onPress={() => setFichierNom('document.pdf')}
            >
              <Ionicons name="folder-outline" size={16} color="#64748b" />
              <Text style={oStyles.filePickerText} numberOfLines={1}>
                {fichierNom || 'Browse...  No file selected.'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={oStyles.formField}>
          <Text style={oStyles.formLabel}>Description</Text>
          <TextInput
            style={[oStyles.input, oStyles.textArea]}
            placeholder="Détails du document (optionnel)..."
            placeholderTextColor="#94a3b8"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={oStyles.checkRow}
          onPress={() => setConfidentiel(!confidentiel)}
        >
          <View style={[oStyles.checkbox, confidentiel && oStyles.checkboxActive]}>
            {confidentiel && <Ionicons name="checkmark" size={12} color="#FFF" />}
          </View>
          <Text style={oStyles.checkLabel}>Confidentiel (réservé aux autorités)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={oStyles.btnUpload}
          onPress={() => Alert.alert('Info', 'Upload à connecter à votre service de fichiers.')}
          disabled={uploading}
        >
          <Ionicons name="cloud-upload-outline" size={18} color="#FFF" />
          <Text style={oStyles.btnUploadText}>Uploader</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ── Onglet Filiation ──────────────────────────────────────────
function OngletFiliation({ dossierId }: { dossierId: string }) {
  const [showForm, setShowForm]           = useState(false);
  const [typeLien, setTypeLien]           = useState('pere_biologique');
  const [precision, setPrecision]         = useState('');
  const [commentaire, setCommentaire]     = useState('');
  const [confidentiel, setConfidentiel]   = useState(true);
  const [visiblePublic, setVisiblePublic] = useState(false);

  const typesLien = [
    { label: 'Père biologique', value: 'pere_biologique' },
    { label: 'Mère biologique', value: 'mere_biologique' },
    { label: 'Frère/Sœur',     value: 'fratrie'         },
    { label: 'Enfant',          value: 'enfant'          },
    { label: 'Conjoint(e)',     value: 'conjoint'        },
    { label: 'Autre',           value: 'autre'           },
  ];

  return (
    <ScrollView contentContainerStyle={oStyles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={oStyles.filiationHeader}>
        <View style={oStyles.sectionHeader}>
          <Ionicons name="people-outline" size={18} color="#1e293b" />
          <Text style={oStyles.sectionTitle}>Filiation</Text>
        </View>
        <TouchableOpacity
          style={oStyles.btnAjouterLien}
          onPress={() => setShowForm(!showForm)}
        >
          <Ionicons name="people-outline" size={16} color="#FFF" />
          <Text style={oStyles.btnAjouterLienText}>Ajouter un lien</Text>
        </TouchableOpacity>
      </View>
      <Text style={oStyles.filiationSub}>Liens familiaux associés à la personne du dossier</Text>

      {!showForm && (
        <View style={oStyles.emptyBox}>
          <Ionicons name="people-outline" size={40} color="#cbd5e1" />
          <Text style={oStyles.emptyText}>Pas de lien de filiation</Text>
        </View>
      )}

      {showForm && (
        <View style={oStyles.formCard}>
          <View style={oStyles.formRow}>
            <View style={oStyles.formHalf}>
              <Text style={oStyles.formLabel}>Type de lien</Text>
              <View style={oStyles.pickerBox}>
                {typesLien.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[oStyles.selectChip, typeLien === opt.value && oStyles.selectChipActive]}
                    onPress={() => setTypeLien(opt.value)}
                  >
                    <Text style={[oStyles.selectChipText, typeLien === opt.value && oStyles.selectChipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={oStyles.formHalf}>
              <Text style={oStyles.formLabel}>Personne liée</Text>
              <View style={oStyles.selectBoxSimple}>
                <Text style={oStyles.selectBoxSimpleText}>Choisir une personne</Text>
                <Ionicons name="chevron-down" size={16} color="#64748b" />
              </View>
            </View>
          </View>

          <View style={oStyles.formField}>
            <Text style={oStyles.formLabel}>Précision (optionnel)</Text>
            <TextInput
              style={oStyles.input}
              placeholder=""
              placeholderTextColor="#94a3b8"
              value={precision}
              onChangeText={setPrecision}
            />
          </View>

          <View style={oStyles.formField}>
            <Text style={oStyles.formLabel}>Commentaire (optionnel)</Text>
            <TextInput
              style={[oStyles.input, oStyles.textArea]}
              placeholder=""
              placeholderTextColor="#94a3b8"
              value={commentaire}
              onChangeText={setCommentaire}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={oStyles.checkboxRow}>
            <TouchableOpacity style={oStyles.checkRow} onPress={() => setConfidentiel(!confidentiel)}>
              <View style={[oStyles.checkbox, confidentiel && oStyles.checkboxActive]}>
                {confidentiel && <Ionicons name="checkmark" size={12} color="#FFF" />}
              </View>
              <Text style={oStyles.checkLabel}>Confidentiel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={oStyles.checkRow} onPress={() => setVisiblePublic(!visiblePublic)}>
              <View style={[oStyles.checkbox, visiblePublic && oStyles.checkboxActive]}>
                {visiblePublic && <Ionicons name="checkmark" size={12} color="#FFF" />}
              </View>
              <Text style={oStyles.checkLabel}>Visible au public</Text>
            </TouchableOpacity>
          </View>

          <View style={oStyles.formBtnsRow}>
            <TouchableOpacity style={oStyles.btnAnnuler} onPress={() => setShowForm(false)}>
              <Text style={oStyles.btnAnnulerText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={oStyles.btnEnregistrer}>
              <Text style={oStyles.btnEnregistrerText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

// ── Onglet Historique ─────────────────────────────────────────
function OngletHistorique({ dossierId }: { dossierId: string }) {
  const [historique, setHistorique] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    supabase
      .from('journal_activite')
      .select('id, type_action, action_detaillee, description, date_action')
      .eq('id_dossier', dossierId)
      .order('date_action', { ascending: false })
      .then(({ data }) => { setHistorique(data || []); setLoading(false); });
  }, [dossierId]);

  const grouped: Record<string, any[]> = {};
  historique.forEach(h => {
    const d = h.date_action ? new Date(h.date_action).toLocaleDateString('fr-FR') : '—';
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(h);
  });

  return (
    <ScrollView contentContainerStyle={oStyles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={oStyles.sectionHeader}>
        <Ionicons name="time-outline" size={18} color="#1e293b" />
        <Text style={oStyles.sectionTitle}>Historique</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 30 }} />
      ) : Object.keys(grouped).length === 0 ? (
        <View style={oStyles.emptyBox}>
          <Ionicons name="time-outline" size={40} color="#cbd5e1" />
          <Text style={oStyles.emptyText}>Aucun historique</Text>
        </View>
      ) : (
        Object.entries(grouped).map(([date, actions]) => (
          <View key={date} style={oStyles.historiqueGroup}>
            <View style={oStyles.historiqueDate}>
              <View style={oStyles.historiqueDot} />
              <Text style={oStyles.historiqueDateText}>{date}</Text>
            </View>
            {actions.map((a, i) => (
              <View key={i} style={oStyles.historiqueItem}>
                <View style={oStyles.historiqueBar} />
                <Text style={oStyles.historiqueAction}>
                  {a.action_detaillee || a.description || a.type_action?.replace(/_/g, ' ') || '—'}
                </Text>
              </View>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

// ── Onglet Analyse IA ─────────────────────────────────────────
function OngletAnalyseIA({ dossierId }: { dossierId: string }) {
  const [imageUri, setImageUri]   = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [resultats, setResultats] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('resultat_ia')
      .select('*')
      .eq('id_dossier', dossierId)
      .order('date_analyse', { ascending: false })
      .then(({ data }) => setResultats(data || []));
  }, [dossierId]);

  const choisirImage = () => {
    launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }, (response) => {
      if (response.assets && response.assets[0]) {
        setImageUri(response.assets[0].uri || null);
      }
    });
  };

  const lancerAnalyse = () => {
    if (!imageUri) { Alert.alert('Aucune image', 'Veuillez sélectionner une image.'); return; }
    setAnalysing(true);
    setTimeout(() => {
      setAnalysing(false);
      Alert.alert('Analyse IA', "L'analyse IA sera connectée à votre serveur externe.");
    }, 2000);
  };

  return (
    <ScrollView contentContainerStyle={oStyles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={oStyles.sectionHeader}>
        <Ionicons name="hardware-chip-outline" size={18} color="#1e293b" />
        <Text style={oStyles.sectionTitle}>Analyse IA</Text>
      </View>

      <View style={oStyles.formCard}>
        <Text style={oStyles.formLabel}>Nouvelle analyse</Text>
        <TouchableOpacity style={oStyles.dropZone} onPress={choisirImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={oStyles.dropZoneImage} />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={36} color="#94a3b8" />
              <Text style={oStyles.dropZoneText}>
                Cliquez pour sélectionner une image ou glissez-la ici
              </Text>
            </>
          )}
        </TouchableOpacity>

        {imageUri && (
          <TouchableOpacity
            style={[oStyles.btnUpload, analysing && { backgroundColor: '#94a3b8' }]}
            onPress={lancerAnalyse}
            disabled={analysing}
          >
            {analysing ? (
              <>
                <ActivityIndicator size="small" color="#FFF" />
                <Text style={oStyles.btnUploadText}>Analyse en cours...</Text>
              </>
            ) : (
              <>
                <Ionicons name="hardware-chip-outline" size={18} color="#FFF" />
                <Text style={oStyles.btnUploadText}>Lancer l'analyse</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <Text style={[oStyles.formLabel, { marginTop: 16 }]}>Résultats des analyses IA</Text>

      {resultats.length === 0 ? (
        <View style={oStyles.emptyBox}>
          <Ionicons name="hardware-chip-outline" size={40} color="#cbd5e1" />
          <Text style={oStyles.emptyText}>Aucune analyse effectuée</Text>
        </View>
      ) : (
        resultats.map((r, i) => (
          <View key={i} style={oStyles.resultatCard}>
            <Text style={oStyles.resultatType}>{r.type_analyse?.replace(/_/g, ' ')}</Text>
            <Text style={oStyles.resultatScore}>Score: {r.score_confiance}%</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

// ── COMPOSANT PRINCIPAL ───────────────────────────────────────
export default function DetailDossierPage({ navigation, route = {} as any }: any) {
  const dossierId = route?.params?.dossierId ?? null;

  // ✅ 2. Tous les hooks EN PREMIER — avant tout return conditionnel
  const [dossier, setDossier]         = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [ongletActif, setOngletActif] = useState('informations');

  const fetchDossier = useCallback(async () => {
    if (!dossierId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dossier_disparition')
        .select('*, personne:id_personne ( * )')
        .eq('id', dossierId)
        .single();
      if (error) throw error;
      setDossier(data);
    } catch (err) {
      console.error('Erreur dossier:', err);
    } finally {
      setLoading(false);
    }
  }, [dossierId]);

  useEffect(() => { fetchDossier(); }, [fetchDossier]);

  // ✅ 3. Return conditionnel APRÈS tous les hooks
  if (!dossierId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingFull}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={{ marginTop: 20, color: '#94a3b8' }}>Aucun dossier sélectionné</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ✅ 4. Le reste du composant...

  useEffect(() => { fetchDossier(); }, [fetchDossier]);

  const getStatutStyle = (s: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      en_cours:        { bg: '#fef3c7', text: '#92400e', label: 'EN COURS'  },
      retrouve_vivant: { bg: '#f0fdf4', text: '#166534', label: 'RETROUVÉ'  },
      suspendu:        { bg: '#f1f5f9', text: '#475569', label: 'SUSPENDU'  },
      cloture:         { bg: '#fee2e2', text: '#991b1b', label: 'CLÔTURÉ'   },
    };
    return map[s] || { bg: '#f1f5f9', text: '#64748b', label: s?.toUpperCase() || '—' };
  };

  const getUrgenceStyle = (u: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      critique: { bg: '#fee2e2', text: '#991b1b' },
      urgent:   { bg: '#fff7ed', text: '#9a3412' },
      normal:   { bg: '#f0fdf4', text: '#166534' },
      faible:   { bg: '#f0fdf4', text: '#166534' },
    };
    return map[u] || { bg: '#f1f5f9', text: '#64748b' };
  };

  const renderOnglet = () => {
    switch (ongletActif) {
      case 'informations':  return <OngletInformations dossier={dossier} navigation={navigation} />;
      case 'photos':        return <OngletPhotos dossierId={dossierId} />;
      case 'signalements':  return <OngletSignalements dossierId={dossierId} />;
      case 'localisations': return <OngletLocalisations dossierId={dossierId} />;
      case 'documents':     return <OngletDocuments dossierId={dossierId} />;
      case 'filiation':     return <OngletFiliation dossierId={dossierId} />;
      case 'historique':    return <OngletHistorique dossierId={dossierId} />;
      case 'analyseIA':     return <OngletAnalyseIA dossierId={dossierId} />;
      default:              return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingFull}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  const ss = getStatutStyle(dossier?.statut_dossier || '');
  const us = getUrgenceStyle(dossier?.niveau_urgence || '');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* HEADER */}
      <View style={styles.dossierHeader}>
        <View style={styles.dossierHeaderTop}>
          <TouchableOpacity style={styles.btnRetour} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={16} color="#64748b" />
            <Text style={styles.btnRetourText}>Retour</Text>
          </TouchableOpacity>
          <View style={styles.dossierHeaderBadges}>
            <View style={[styles.statutBadge, { backgroundColor: ss.bg }]}>
              <Text style={[styles.statutBadgeText, { color: ss.text }]}>{ss.label}</Text>
            </View>
            <View style={[styles.urgenceBadge, { backgroundColor: us.bg }]}>
              <Text style={[styles.urgenceBadgeText, { color: us.text }]}>
                {dossier?.niveau_urgence?.toUpperCase() || 'NORMAL'}
              </Text>
            </View>
          </View>
        </View>
        <Text style={styles.dossierNum}>{dossier?.numero_dossier || '—'}</Text>
        <Text style={styles.dossierType}>Dossier de disparition</Text>
      </View>

      {/* ONGLETS */}
      <View style={styles.ongletsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row' }}>
            {ONGLETS.map(o => (
              <TouchableOpacity
                key={o.key}
                style={[styles.onglet, ongletActif === o.key && styles.ongletActive]}
                onPress={() => setOngletActif(o.key)}
              >
                <Ionicons
                  name={o.icon as any}
                  size={14}
                  color={ongletActif === o.key ? '#2563eb' : '#64748b'}
                />
                <Text style={[styles.ongletText, ongletActif === o.key && styles.ongletTextActive]}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={{ flex: 1 }}>
        {renderOnglet()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#f8fafc' },
  loadingFull:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  dossierHeader:       { backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  dossierHeaderTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  btnRetour:           { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  btnRetourText:       { fontSize: 13, color: '#64748b', fontWeight: '600' },
  dossierHeaderBadges: { flexDirection: 'row', gap: 8 },
  statutBadge:         { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  statutBadgeText:     { fontSize: 11, fontWeight: 'bold' },
  urgenceBadge:        { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  urgenceBadgeText:    { fontSize: 11, fontWeight: 'bold' },
  dossierNum:          { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  dossierType:         { fontSize: 12, color: '#64748b', marginTop: 2 },
  ongletsContainer:    { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  onglet:              { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 14 },
  ongletActive:        { borderBottomWidth: 2, borderBottomColor: '#2563eb' },
  ongletText:          { fontSize: 12, color: '#64748b', fontWeight: '500' },
  ongletTextActive:    { color: '#2563eb', fontWeight: '700' },
});

const oStyles = StyleSheet.create({
  scrollContent:        { padding: 16, paddingBottom: 30 },
  grid:                 { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  card:                 { backgroundColor: '#FFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', width: '47%' },
  cardHeader:           { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cardTitle:            { fontSize: 13, fontWeight: 'bold', color: '#1e293b' },
  infoRow:              { flexDirection: 'row', gap: 6, marginBottom: 8, alignItems: 'flex-start' },
  infoLabel:            { fontSize: 11, color: '#94a3b8' },
  infoValue:            { fontSize: 12, fontWeight: '600', color: '#1e293b' },
  statsGrid:            { gap: 0 },
  statBox:              { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', alignItems: 'center' },
  statNum:              { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  statLabel:            { fontSize: 11, color: '#64748b' },
  actionsRow:           { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnAction:            { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 10 },
  btnActionText:        { color: '#FFF', fontWeight: '600', fontSize: 13 },
  sectionHeader:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionTitle:         { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  emptyBox:             { alignItems: 'center', paddingVertical: 40, gap: 8, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 12 },
  emptyText:            { fontSize: 13, color: '#94a3b8' },
  formCard:             { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 12 },
  formRow:              { flexDirection: 'row', gap: 12, marginBottom: 12 },
  formHalf:             { flex: 1 },
  formField:            { marginBottom: 12 },
  formLabel:            { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input:                { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, height: 44, fontSize: 13, color: '#1e293b' },
  textArea:             { height: 80, paddingTop: 10 },
  pickerBox:            { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  selectChip:           { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  selectChipActive:     { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  selectChipText:       { fontSize: 11, color: '#64748b' },
  selectChipTextActive: { color: '#FFF', fontWeight: '600' },
  filePicker:           { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, height: 44 },
  filePickerText:       { fontSize: 12, color: '#64748b', flex: 1 },
  checkRow:             { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  checkbox:             { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: '#d1d5db', justifyContent: 'center', alignItems: 'center' },
  checkboxActive:       { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  checkLabel:           { fontSize: 13, color: '#1e293b' },
  checkboxRow:          { flexDirection: 'row', gap: 20, marginBottom: 12 },
  btnUpload:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 12, marginTop: 8 },
  btnUploadText:        { color: '#FFF', fontWeight: '700', fontSize: 14 },
  filiationHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  filiationSub:         { fontSize: 12, color: '#64748b', marginBottom: 12 },
  btnAjouterLien:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  btnAjouterLienText:   { color: '#FFF', fontWeight: '600', fontSize: 12 },
  selectBoxSimple:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, height: 44 },
  selectBoxSimpleText:  { fontSize: 13, color: '#94a3b8' },
  formBtnsRow:          { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  btnAnnuler:           { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  btnAnnulerText:       { fontSize: 13, color: '#64748b', fontWeight: '600' },
  btnEnregistrer:       { backgroundColor: '#2563eb', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  btnEnregistrerText:   { fontSize: 13, color: '#FFF', fontWeight: '700' },
  historiqueGroup:      { marginBottom: 16 },
  historiqueDate:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  historiqueDot:        { width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: '#2563eb', backgroundColor: '#FFF' },
  historiqueDateText:   { fontSize: 13, fontWeight: 'bold', color: '#2563eb' },
  historiqueItem:       { flexDirection: 'row', gap: 12, marginLeft: 20, marginBottom: 4 },
  historiqueBar:        { width: 3, backgroundColor: '#2563eb', borderRadius: 2 },
  historiqueAction:     { fontSize: 13, color: '#475569', flex: 1, paddingVertical: 4 },
  dropZone:             { borderWidth: 2, borderColor: '#d1d5db', borderStyle: 'dashed', borderRadius: 10, padding: 30, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#f8fafc', marginBottom: 12 },
  dropZoneText:         { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
  dropZoneImage:        { width: '100%', height: 180, borderRadius: 8, resizeMode: 'cover' },
  resultatCard:         { backgroundColor: '#FFF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8 },
  resultatType:         { fontSize: 13, fontWeight: 'bold', color: '#1e293b', textTransform: 'capitalize' },
  resultatScore:        { fontSize: 12, color: '#2563eb', marginTop: 4 },
});