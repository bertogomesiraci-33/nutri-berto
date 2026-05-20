import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Flower, 
  Users, 
  LayoutDashboard, 
  LogOut, 
  ArrowLeft,
  Pencil,
  Plus,
  MessageSquare,
  Mail,
  Clock,
  Activity,
  HeartPulse,
  Calendar,
  TrendingUp
} from 'lucide-react';

interface Paciente {
  id: string;
  nome: string;
  data_nascimento: string | null;
  sexo: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  
  horario_acorda: string | null;
  horario_dorme: string | null;
  litros_agua: number | null;
  refeicoes_por_dia: number | null;
  atividade_fisica: boolean;
  atividade_fisica_descricao: string | null;
  
  peso_inicial: number | null;
  altura: number | null;
  nivel_atividade: string | null;
  objetivos: string[] | null;
  objetivo_texto: string | null;
  
  patologias: string[] | null;
  restricoes_alimentares: string[] | null;
  alergias: string[] | null;
  medicamentos: string | null;
  suplementos: string | null;
  observacoes: string | null;
  created_at?: string;
}

interface Consulta {
  id: string;
  data_consulta: string;
  peso: number | null;
  cintura: number | null;
  quadril: number | null;
  percentual_gordura: number | null;
  observacoes: string | null;
  proximo_retorno: string | null;
}

const PatientProfile: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const { id } = useParams<{ id: string }>();

  // Estados
  const [patient, setPatient] = useState<Paciente | null>(null);
  const [consultations, setConsultations] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<'ficha' | 'evolucao'>('ficha');

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Erro ao deslogar:', err);
    }
  };

  const fetchPatientProfile = async () => {
    if (!id || !user) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Buscar Paciente
      const { data: pData, error: pError } = await supabase
        .from('pacientes')
        .select('*')
        .eq('id', id)
        .single();

      if (pError) throw pError;
      setPatient(pData);

      // 2. Buscar Consultas
      const { data: cData, error: cError } = await supabase
        .from('consultas')
        .select('*')
        .eq('paciente_id', id)
        .order('data_consulta', { ascending: false });

      if (cError) throw cError;
      setConsultations(cData || []);

    } catch (err: any) {
      console.error('Erro ao carregar perfil:', err);
      setError('Erro ao carregar prontuário do paciente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientProfile();
  }, [id, user]);

  // Cálculo da idade
  const calculateAge = (dateString: string | null) => {
    if (!dateString) return '-';
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} anos`;
  };

  // Formatar IMC
  const getIMC = (peso: number | null, altura: number | null) => {
    if (!peso || !altura) return '-';
    const heightInMeters = altura > 3 ? altura / 100 : altura;
    return (peso / (heightInMeters * heightInMeters)).toFixed(2);
  };

  // Iniciais para avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length === 0 || !parts[0]) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Link do WhatsApp
  const formatWhatsAppUrl = (phone: string | null) => {
    if (!phone) return '#';
    const cleanPhone = phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    return `https://wa.me/${finalPhone}`;
  };

  return (
    <div className="dashboard-layout">
      {/* Menu Lateral Fixo */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-logo">
            <Flower className="logo-flower" />
            Nutri_Berto
          </h1>
        </div>
        
        <nav className="sidebar-menu">
          <button onClick={() => navigate('/dashboard')} className="sidebar-item-btn">
            <LayoutDashboard />
            Dashboard
          </button>
          
          <button onClick={() => navigate('/pacientes')} className="sidebar-item-btn active">
            <Users />
            Pacientes
          </button>

          <button onClick={() => navigate('/consultas')} className="sidebar-item-btn">
            <Calendar />
            Consultas
          </button>
        </nav>
        
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="btn-logout">
            <LogOut />
            Sair da Conta
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="main-content">
        <header className="patients-header-actions" style={{ marginBottom: '16px' }}>
          <div className="welcome-section" style={{ marginBottom: 0 }}>
            <h2 className="welcome-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowLeft 
                style={{ cursor: 'pointer', marginRight: '8px' }} 
                onClick={() => navigate('/pacientes')} 
              />
              Prontuário Clínico
            </h2>
          </div>
        </header>

        {error && <div className="error-message" style={{ marginBottom: '24px' }}>{error}</div>}

        {loading || !patient ? (
          <div className="form-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
            <p style={{ color: 'var(--text-secondary)' }}>Carregando dados do prontuário...</p>
          </div>
        ) : (
          <>
            {/* Header do Prontuário */}
            <div className="profile-header-container">
              <div className="profile-avatar-large">
                {getInitials(patient.nome)}
              </div>
              <div className="profile-header-info">
                <h3 className="profile-header-name">{patient.nome}</h3>
                <div className="profile-header-meta">
                  <span><strong>Idade:</strong> {calculateAge(patient.data_nascimento)}</span>
                  {patient.sexo && <span><strong>Sexo:</strong> {patient.sexo}</span>}
                  {patient.whatsapp && (
                    <a 
                      href={formatWhatsAppUrl(patient.whatsapp)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="patient-whatsapp-link"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <MessageSquare size={14} style={{ color: '#25d366' }} />
                      {patient.whatsapp}
                    </a>
                  )}
                  {patient.email && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Mail size={14} />
                      {patient.email}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="profile-header-actions">
                <button 
                  onClick={() => navigate(`/pacientes/editar/${patient.id}`)}
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}
                >
                  <Pencil size={16} />
                  Editar Ficha
                </button>
                <button 
                  onClick={() => navigate('/consultas')}
                  className="btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }}
                >
                  <Plus size={16} />
                  Registrar Consulta
                </button>
              </div>
            </div>

            {/* Abas do Prontuário */}
            <div className="profile-tabs">
              <button 
                className={`profile-tab-btn ${activeProfileTab === 'ficha' ? 'active' : ''}`}
                onClick={() => setActiveProfileTab('ficha')}
              >
                Ficha Cadastral Completa
              </button>
              <button 
                className={`profile-tab-btn ${activeProfileTab === 'evolucao' ? 'active' : ''}`}
                onClick={() => setActiveProfileTab('evolucao')}
              >
                Histórico & Evolução Física ({consultations.length})
              </button>
            </div>

            {/* CONTEÚDO 1: FICHA CADASTRAL */}
            {activeProfileTab === 'ficha' && (
              <div className="profile-grid-three-col">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Clínico */}
                  <section className="modal-summary-section" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
                    <h4 className="modal-section-title" style={{ fontSize: '1.1rem', marginBottom: '18px' }}>
                      <Activity size={18} />
                      Avaliação Física & Clínico
                    </h4>
                    <div className="summary-grid" style={{ gap: '16px' }}>
                      <div className="summary-item">
                        <span className="summary-label">Peso Inicial</span>
                        <span className="summary-value" style={{ fontSize: '1.05rem' }}>{patient.peso_inicial ? `${patient.peso_inicial} kg` : '-'}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Altura</span>
                        <span className="summary-value" style={{ fontSize: '1.05rem' }}>{patient.altura ? `${patient.altura} cm` : '-'}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">IMC Cadastrado</span>
                        <span className="summary-value" style={{ fontSize: '1.05rem', fontWeight: 'bold' }}>
                          {getIMC(patient.peso_inicial, patient.altura)}
                        </span>
                      </div>
                      <div className="summary-item" style={{ gridColumn: 'span 2' }}>
                        <span className="summary-label">Nível de Atividade</span>
                        <span className="summary-value">{patient.nivel_atividade || '-'}</span>
                      </div>
                      
                      <div className="summary-item" style={{ gridColumn: 'span 3' }}>
                        <span className="summary-label">Objetivos</span>
                        <div className="tags-preset-container" style={{ marginTop: '6px' }}>
                          {patient.objetivos && patient.objetivos.length > 0 ? (
                            patient.objetivos.map(tag => (
                              <span key={tag} className="tag-badge" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>{tag}</span>
                            ))
                          ) : (
                            <span className="summary-value empty">Nenhum</span>
                          )}
                        </div>
                      </div>

                      {patient.objetivo_texto && (
                        <div className="summary-item" style={{ gridColumn: 'span 3' }}>
                          <span className="summary-label">Detalhes do Objetivo</span>
                          <pre className="summary-value-text" style={{ padding: '12px', borderRadius: '8px' }}>{patient.objetivo_texto}</pre>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Hábitos */}
                  <section className="modal-summary-section" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
                    <h4 className="modal-section-title" style={{ fontSize: '1.1rem', marginBottom: '18px' }}>
                      <Clock size={18} />
                      Rotina & Hábitos
                    </h4>
                    <div className="summary-grid" style={{ gap: '16px' }}>
                      <div className="summary-item">
                        <span className="summary-label">Refeições/dia</span>
                        <span className="summary-value">{patient.refeicoes_por_dia || '-'}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Horário de Acordar</span>
                        <span className="summary-value">{patient.horario_acorda || '-'}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Horário de Dormir</span>
                        <span className="summary-value">{patient.horario_dorme || '-'}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Consumo de Água</span>
                        <span className="summary-value">{patient.litros_agua ? `${patient.litros_agua} litros` : '-'}</span>
                      </div>
                      
                      <div className="summary-item" style={{ gridColumn: 'span 2' }}>
                        <span className="summary-label">Atividade Física Regular</span>
                        <span className="summary-value">
                          {patient.atividade_fisica ? 'Sim' : 'Não'}
                          {patient.atividade_fisica && patient.atividade_fisica_descricao && (
                            <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 'normal' }}>
                              ({patient.atividade_fisica_descricao})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Coluna Direita: Anamnese e Medicamentos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <section className="modal-summary-section" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', height: '100%' }}>
                    <h4 className="modal-section-title" style={{ fontSize: '1.1rem', marginBottom: '18px' }}>
                      <HeartPulse size={18} />
                      Anamnese & Prontuário
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      
                      {/* Patologias */}
                      <div>
                        <span className="summary-label" style={{ marginBottom: '6px', display: 'block' }}>Patologias</span>
                        <div className="tags-preset-container">
                          {patient.patologias && patient.patologias.length > 0 ? (
                            patient.patologias.map(tag => (
                              <span key={tag} className="tag-badge" style={{ backgroundColor: 'rgba(211, 47, 47, 0.05)', color: 'var(--primary-color)' }}>{tag}</span>
                            ))
                          ) : (
                            <span className="summary-value empty">Nenhuma diagnosticada</span>
                          )}
                        </div>
                      </div>

                      {/* Restrições */}
                      <div>
                        <span className="summary-label" style={{ marginBottom: '6px', display: 'block' }}>Restrições</span>
                        <div className="tags-preset-container">
                          {patient.restricoes_alimentares && patient.restricoes_alimentares.length > 0 ? (
                            patient.restricoes_alimentares.map(tag => (
                              <span key={tag} className="tag-badge" style={{ backgroundColor: '#fafafa', color: 'var(--text-color)', borderColor: 'var(--border-color)' }}>{tag}</span>
                            ))
                          ) : (
                            <span className="summary-value empty">Nenhuma declarada</span>
                          )}
                        </div>
                      </div>

                      {/* Alergias */}
                      <div>
                        <span className="summary-label" style={{ marginBottom: '6px', display: 'block' }}>Alergias</span>
                        <div className="tags-preset-container">
                          {patient.alergias && patient.alergias.length > 0 ? (
                            patient.alergias.map(tag => (
                              <span key={tag} className="tag-badge" style={{ backgroundColor: '#fff8f8', color: '#b71c1c' }}>{tag}</span>
                            ))
                          ) : (
                            <span className="summary-value empty">Nenhuma declarada</span>
                          )}
                        </div>
                      </div>

                      {/* Medicamentos */}
                      <div>
                        <span className="summary-label" style={{ marginBottom: '4px', display: 'block' }}>Medicamentos Contínuos</span>
                        {patient.medicamentos ? (
                          <pre className="summary-value-text" style={{ padding: '10px' }}>{patient.medicamentos}</pre>
                        ) : (
                          <span className="summary-value empty" style={{ fontSize: '0.85rem' }}>Nenhum</span>
                        )}
                      </div>

                      {/* Suplementos */}
                      <div>
                        <span className="summary-label" style={{ marginBottom: '4px', display: 'block' }}>Suplementos</span>
                        {patient.suplementos ? (
                          <pre className="summary-value-text" style={{ padding: '10px' }}>{patient.suplementos}</pre>
                        ) : (
                          <span className="summary-value empty" style={{ fontSize: '0.85rem' }}>Nenhum</span>
                        )}
                      </div>

                      {/* Observações */}
                      {patient.observacoes && (
                        <div>
                          <span className="summary-label" style={{ marginBottom: '4px', display: 'block' }}>Observações Gerais</span>
                          <pre className="summary-value-text" style={{ padding: '10px' }}>{patient.observacoes}</pre>
                        </div>
                      )}

                    </div>
                  </section>
                </div>
              </div>
            )}

            {/* CONTEÚDO 2: HISTÓRICO & EVOLUÇÃO FÍSICA */}
            {activeProfileTab === 'evolucao' && (
              <div className="profile-evolution-card">
                <h4 className="modal-section-title" style={{ fontSize: '1.1rem', marginBottom: '18px' }}>
                  <TrendingUp size={18} />
                  Evolução Antropométrica e Histórico de Consultas
                </h4>
                
                {consultations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                    <Calendar size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p style={{ fontSize: '1rem', fontStyle: 'italic' }}>Nenhuma consulta foi registrada para este paciente ainda.</p>
                    <button 
                      onClick={() => navigate('/consultas')} 
                      className="btn-primary" 
                      style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Plus size={16} />
                      Registrar Primeira Consulta
                    </button>
                  </div>
                ) : (
                  <div className="evolution-table-wrapper">
                    <table className="evolution-table">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Peso (kg)</th>
                          <th>IMC</th>
                          <th>Cintura (cm)</th>
                          <th>Quadril (cm)</th>
                          <th>Gordura (%)</th>
                          <th>Próximo Retorno</th>
                          <th>Observações Clinicas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consultations.map(c => (
                          <tr key={c.id}>
                            <td style={{ fontWeight: '700' }}>
                              {new Date(c.data_consulta + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </td>
                            <td>{c.peso ? `${c.peso} kg` : '-'}</td>
                            <td>{getIMC(c.peso, patient.altura)}</td>
                            <td>{c.cintura ? `${c.cintura} cm` : '-'}</td>
                            <td>{c.quadril ? `${c.quadril} cm` : '-'}</td>
                            <td>{c.percentual_gordura ? `${c.percentual_gordura}%` : '-'}</td>
                            <td>
                              {c.proximo_retorno 
                                ? new Date(c.proximo_retorno + 'T00:00:00').toLocaleDateString('pt-BR') 
                                : '-'}
                            </td>
                            <td style={{ maxWidth: '300px', fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                              {c.observacoes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default PatientProfile;
