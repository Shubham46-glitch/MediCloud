// Demo Users for the 3 MediCloud Roles
export const mockUsers = {
  patient: {
    id: 'pat-1',
    role: 'patient',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@example.com',
    phone: '+1 (555) 234-5678',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300',
    bloodGroup: 'O+',
    dateOfBirth: '1992-06-14',
    gender: 'Female',
    address: '450 Lexington Ave, New York, NY 10017',
    emergencyContact: {
      name: 'Robert Jenkins (Spouse)',
      phone: '+1 (555) 345-9876'
    },
    allergies: ['Penicillin', 'Peanuts (Mild)'],
    insuranceProvider: 'BlueCross Health Premier',
    policyNumber: 'BC-99281-X7',
    memberSince: 'March 2024'
  },
  doctor: {
    id: 'doc-1',
    role: 'doctor',
    name: 'Dr. Marcus Vance',
    email: 'marcus.vance@medicloud.demo',
    phone: '+1 (555) 432-8765',
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
    title: 'MD, FACC - Senior Cardiologist',
    specialty: 'Cardiology',
    hospital: 'St. Jude Heart Institute',
    licenseNumber: 'MD-NY-842918',
    department: 'Cardiovascular Medicine',
    officeLocation: 'Suite 402, St. Jude Medical Tower, New York, NY',
    consultationFee: 150,
    experience: 16
  },
  admin: {
    id: 'adm-1',
    role: 'admin',
    name: 'Eleanor Vance',
    email: 'admin@medicloud.demo',
    phone: '+1 (555) 800-9000',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300',
    title: 'Platform Director & Clinical Administrator',
    department: 'Hospital System Operations',
    permissions: ['full_system_access', 'manage_providers', 'audit_logs', 'billing_reports']
  }
};
