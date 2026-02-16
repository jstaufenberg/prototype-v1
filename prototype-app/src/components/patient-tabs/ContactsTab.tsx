import { useMemo, useState } from 'react';
import type { PatientRecord } from '../../types/mockData';

interface ContactsTabProps {
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

export default function ContactsTab({ patient }: ContactsTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [localContacts, setLocalContacts] = useState<LocalContact[]>([]);
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formNotes, setFormNotes] = useState('');

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

  const insurance = patient.patient_profile.insurance;
  const insuranceExtra = insurance as Record<string, unknown>;

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
