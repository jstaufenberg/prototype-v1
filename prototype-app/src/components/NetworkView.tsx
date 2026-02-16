import { useState } from 'react';
import facilitiesData from '../mock-data/reference-facilities.json';
import payersData from '../mock-data/reference-payers.json';
import staffData from '../mock-data/reference-staff.json';

interface Facility {
  facility_id: string;
  name: string;
  type: string;
  in_network_payers: string[];
  capabilities: Record<string, boolean>;
  contacts: Array<{ contact_id: string; channel: string; value: string }>;
}

interface Payer {
  payer_id: string;
  name: string;
  default_channels: string[];
  auth_phone: string | null;
}

interface Staff {
  staff_id: string;
  name: string;
  role: string;
  pager: string;
}

const facilities = (facilitiesData as { facilities: Facility[] }).facilities;
const payers = (payersData as { payers: Payer[] }).payers;
const staff = (staffData as { staff: Staff[] }).staff;

function capabilityLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function payerName(payerId: string): string {
  return payers.find((p) => p.payer_id === payerId)?.name ?? payerId;
}

/* ── Sub-tab definitions ── */

type NetworkTab = 'facilities' | 'payers' | 'care-team';

const NETWORK_TABS: Array<{ id: NetworkTab; label: string }> = [
  { id: 'facilities', label: 'Facilities' },
  { id: 'payers', label: 'Payers' },
  { id: 'care-team', label: 'Care Team' },
];

export default function NetworkView() {
  const [activeTab, setActiveTab] = useState<NetworkTab>('facilities');

  return (
    <section className="view-single-pane network-view">
      {/* ── Sub-tab navigation ── */}
      <nav className="detail-tabs" role="tablist" aria-label="Network sections">
        {NETWORK_TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`detail-tab ${activeTab === tab.id ? 'detail-tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ── Tab content ── */}
      <div className="detail-tab-content">
        {/* Facilities */}
        {activeTab === 'facilities' && (
          <div>
            <p className="subtle">{facilities.length} facilities in network</p>
            <div className="network-grid">
              {facilities.map((facility) => (
                <div key={facility.facility_id} className="network-card">
                  <div className="network-card-header">
                    <strong>{facility.name}</strong>
                    <span className="chip">{facility.type}</span>
                  </div>
                  <div className="network-card-body">
                    <p className="network-label">Capabilities</p>
                    <div className="network-chip-list">
                      {Object.entries(facility.capabilities).map(([key, supported]) => (
                        <span key={key} className={`chip ${supported ? 'chip-accent' : ''}`}>
                          {supported ? '\u2713' : '\u2717'} {capabilityLabel(key)}
                        </span>
                      ))}
                    </div>
                    <p className="network-label">In-Network Payers</p>
                    <div className="network-chip-list">
                      {facility.in_network_payers.map((payerId) => (
                        <span key={payerId} className="chip">{payerName(payerId)}</span>
                      ))}
                    </div>
                    <p className="network-label">Contact</p>
                    {facility.contacts.map((contact) => (
                      <p key={contact.contact_id} className="network-contact-line">
                        <span className="network-channel">{contact.channel}</span> {contact.value}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payers */}
        {activeTab === 'payers' && (
          <div>
            <p className="subtle">{payers.length} payers configured</p>
            <div className="network-grid">
              {payers.map((payer) => (
                <div key={payer.payer_id} className="network-card">
                  <strong>{payer.name}</strong>
                  <div className="network-card-body">
                    {payer.auth_phone && <p>Auth line: {payer.auth_phone}</p>}
                    <p className="network-label">Channels</p>
                    <div className="network-chip-list">
                      {payer.default_channels.map((ch) => (
                        <span key={ch} className="chip">{ch}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Care Team */}
        {activeTab === 'care-team' && (
          <div>
            <p className="subtle">{staff.length} team members</p>
            <div className="network-grid">
              {staff.map((member) => (
                <div key={member.staff_id} className="network-card">
                  <strong>{member.name}</strong>
                  <p className="subtle">{member.role}</p>
                  <p>Pager: {member.pager}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
