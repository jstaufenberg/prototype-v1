import { useMemo, useState } from 'react';
import type { PatientRecord } from '../../types/mockData';

interface ContextTabProps {
  patient: PatientRecord;
}

interface LocalContact {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  notes: string;
}

export default function ContextTab({ patient }: ContextTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [localContacts, setLocalContacts] = useState<LocalContact[]>([]);
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formNotes, setFormNotes] = useState('');

  /* ── Patient Details ── */
  const los = patient.worklist_view_state.los_day;
  const expectedLos = patient.worklist_view_state.expected_los_day;
  const losDelta = expectedLos ? los - expectedLos : null;
  const insurance = patient.patient_profile.insurance;

  /* ── Care Team ── */
  const careTeam = useMemo(() => {
    const profile = patient.patient_profile as Record<string, unknown>;
    const team = profile.care_team as Record<string, { staff_id: string; name: string }> | undefined;
    if (!team) return [];
    return Object.entries(team).map(([role, member]) => ({
      role: role.replace(/_/g, ' '),
      name: member.name,
      staffId: member.staff_id
    }));
  }, [patient.patient_profile]);

  const insuranceExtra = insurance as Record<string, unknown>;

  /* ── Facility contacts (from proposed_actions target_entities) ── */
  const facilityContacts = useMemo(() => {
    const contacts: Array<{ name: string; contact: string; type: string; channel?: string }> = [];
    for (const action of patient.proposed_actions.items) {
      for (const entity of action.target_entities) {
        if (entity.type === 'facility' && entity.contact) {
          contacts.push({
            name: entity.name,
            contact: entity.contact,
            type: entity.type,
            channel: (entity as Record<string, unknown>).channel as string | undefined
          });
        }
      }
    }
    return contacts;
  }, [patient.proposed_actions.items]);

  /* ── Other contacts ── */
  const otherContacts = useMemo(() => {
    const contacts: Array<{ name: string; contact: string; type: string }> = [];
    for (const action of patient.proposed_actions.items) {
      for (const entity of action.target_entities) {
        if (entity.type !== 'facility' && entity.type !== 'payer' && entity.contact) {
          contacts.push({
            name: entity.name,
            contact: entity.contact,
            type: entity.type
          });
        }
      }
    }
    return contacts;
  }, [patient.proposed_actions.items]);

  /* ── Key Findings (moved from Care Plan) ── */
  const keyFindings = useMemo(
    () => patient.parsed_insights.items.filter(
      (insight) => insight.confidence_label === 'High' || insight.confidence_label === 'Moderate'
    ),
    [patient.parsed_insights.items]
  );

  const submitContact = () => {
    const name = formName.trim();
    if (!name) return;
    setLocalContacts((prev) => [
      ...prev,
      {
        id: `LOCAL-C-${prev.length + 1}`,
        name,
        role: formRole.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        notes: formNotes.trim()
      }
    ]);
    setShowAddForm(false);
    setFormName('');
    setFormRole('');
    setFormPhone('');
    setFormEmail('');
    setFormNotes('');
  };

  return (
    <>
      {/* Patient Details */}
      <div className="section-head">
        <h3>Patient Details</h3>
      </div>

      <div className="contact-detail-block">
        <div className="contact-detail-row">
          <span className="contact-label">Diagnosis</span>
          <span>{patient.patient_profile.primary_diagnosis}</span>
        </div>
        <div className="contact-detail-row">
          <span className="contact-label">MRN</span>
          <span>{patient.patient_profile.mrn}</span>
        </div>
        <div className="contact-detail-row">
          <span className="contact-label">Attending</span>
          <span>{patient.patient_profile.attending_physician}</span>
        </div>
        <div className="contact-detail-row">
          <span className="contact-label">LOS</span>
          <span>
            Day {los}{expectedLos && <> / {expectedLos} expected{losDelta != null && losDelta > 0 && <span className="los-over"> (+{losDelta}d)</span>}</>}
          </span>
        </div>
        <div className="contact-detail-row">
          <span className="contact-label">Disposition</span>
          <strong className="disposition-value">&rarr; {patient.patient_profile.disposition_target}</strong>
        </div>
      </div>

      {/* Insurance & Authorization */}
      <div className="section-head">
        <h3>Insurance &amp; Authorization</h3>
      </div>

      <div className="contact-detail-block">
        <div className="contact-detail-row">
          <span className="contact-label">Payer</span>
          <span>{insurance.payer_name}</span>
        </div>
        {typeof insuranceExtra.plan_type === 'string' && (
          <div className="contact-detail-row">
            <span className="contact-label">Plan</span>
            <span>{insuranceExtra.plan_type}</span>
          </div>
        )}
        {typeof insuranceExtra.member_id === 'string' && (
          <div className="contact-detail-row">
            <span className="contact-label">Member ID</span>
            <span>{insuranceExtra.member_id}</span>
          </div>
        )}
        <div className="contact-detail-row">
          <span className="contact-label">Auth Status</span>
          <span className={`auth-badge auth-${insurance.auth_status.toLowerCase()}`}>{insurance.auth_status}</span>
        </div>
        {insurance.auth_reference && (
          <div className="contact-detail-row">
            <span className="contact-label">Auth Ref</span>
            <span>{insurance.auth_reference}</span>
          </div>
        )}
        {insurance.auth_deadline_local && (
          <div className="contact-detail-row">
            <span className="contact-label">Deadline</span>
            <span>{insurance.auth_deadline_local.slice(0, 16).replace('T', ' ')}</span>
          </div>
        )}
      </div>

      {/* Care Team */}
      <div className="section-head">
        <h3>Care Team</h3>
      </div>

      {careTeam.length === 0 ? (
        <p className="subtle">No care team members listed.</p>
      ) : (
        <ul className="contacts-list">
          {careTeam.map((member) => (
            <li key={member.staffId} className="contact-row">
              <strong>{member.name}</strong>
              <span className="contact-role">{member.role}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Discharge Destination */}
      <div className="section-head">
        <h3>Discharge Destination</h3>
      </div>

      <div className="contact-detail-block">
        <div className="contact-detail-row">
          <span className="contact-label">Target</span>
          <strong className="disposition-value">&rarr; {patient.patient_profile.disposition_target}</strong>
        </div>
        {facilityContacts.map((fc, i) => (
          <div key={i} className="contact-detail-row">
            <span className="contact-label">Facility</span>
            <span>{fc.name} · {fc.contact}{fc.channel ? ` (${fc.channel})` : ''}</span>
          </div>
        ))}
      </div>

      {/* Key Findings */}
      {keyFindings.length > 0 && (
        <>
          <div className="section-head">
            <h3>Key Findings ({keyFindings.length})</h3>
          </div>
          <ul className="key-findings-list">
            {keyFindings.map((insight) => (
              <li key={insight.insight_id} className="key-finding-card">
                <div className="key-finding-header">
                  <strong>{insight.title}</strong>
                  <span className={`confidence-badge ${insight.confidence_label === 'High' ? 'confidence-high' : 'confidence-moderate'}`}>
                    {insight.confidence_label}
                  </span>
                </div>
                <p className="key-finding-value">{insight.value}</p>
                {insight.source_snippets && insight.source_snippets.length > 0 && (
                  <p className="key-finding-snippet">{insight.source_snippets[0]}</p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Other Contacts */}
      {(otherContacts.length > 0 || localContacts.length > 0) && (
        <>
          <div className="section-head">
            <h3>Other Contacts</h3>
          </div>
          <ul className="contacts-list">
            {otherContacts.map((c, i) => (
              <li key={`other-${i}`} className="contact-row">
                <strong>{c.name}</strong>
                <span className="contact-role">{c.type}</span>
                <span className="subtle">{c.contact}</span>
              </li>
            ))}
            {localContacts.map((c) => (
              <li key={c.id} className="contact-row">
                <strong>{c.name}</strong>
                <span className="contact-role">{c.role || 'Contact'}</span>
                {c.phone && <span className="subtle">{c.phone}</span>}
                {c.email && <span className="subtle">{c.email}</span>}
                {c.notes && <span className="subtle">{c.notes}</span>}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Add Contact */}
      <div className="contacts-add-area">
        {showAddForm ? (
          <div className="add-contact-form">
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Name" />
            <input type="text" value={formRole} onChange={(e) => setFormRole(e.target.value)} placeholder="Role / Type" />
            <input type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="Phone" />
            <input type="text" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="Email" />
            <input type="text" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Notes" />
            <div className="card-actions-footer">
              <button className="secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button className="primary-action" onClick={submitContact}>Save contact</button>
            </div>
          </div>
        ) : (
          <button className="secondary" onClick={() => setShowAddForm(true)}>+ Add Contact</button>
        )}
      </div>
    </>
  );
}
