import mongoose, { Document, Schema } from 'mongoose';

export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'incomplete';
export type VerificationRole = 'student' | 'mentor' | 'employer' | 'investor' | 'sponsor' | 'entrepreneur' | 'admin';
export type VerificationLevel = 0 | 1 | 2 | 3; // L0: Basic, L1: ID Verified, L2: Role Verified, L3: Trusted/Premium

// Global document types by region
export type IDDocumentType = 
  // India
  | 'aadhaar' | 'pan' | 'passport' | 'driving_license' | 'voter_id'
  // US
  | 'ssn' | 'us_passport' | 'us_driving_license'
  // EU/UK
  | 'eu_passport' | 'eu_national_id' | 'uk_passport'
  // Others
  | 'national_id' | 'student_id' | 'other';

export type CountryCode = 'IN' | 'US' | 'GB' | 'CA' | 'AU' | 'SG' | 'AE' | 'EU' | 'OTHER';

export type BusinessDocumentType =
  // India
  | 'gst' | 'cin' | 'pan_business'
  // US
  | 'ein'
  // EU/UK
  | 'vat' | 'companies_house'
  // Others
  | 'business_registration' | 'trade_license' | 'other';

export interface IVerification extends Document {
  userId: mongoose.Types.ObjectId;
  role: VerificationRole;
  verificationLevel: VerificationLevel;
  status: VerificationStatus;
  
  // Global fields - common to all roles
  country: CountryCode;
  phoneNumber?: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  
  // Student verification fields
  personalInfo?: {
    fullName: string;
    dateOfBirth: Date;
    gender: 'male' | 'female' | 'other';
    nationality: string;
  };
  idProof?: {
    type: IDDocumentType;
    number: string;
    documentUrl?: string;
    expiryDate?: Date;
    country: CountryCode;
  };
  educationInfo?: {
    institution: string;
    course: string;
    year: string;
    studentId: string;
    transcriptUrl?: string;
    qualification?: string;
  };
  profilePicture?: string;
  additionalDocuments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  socialProfiles?: {
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
  
  // Mentor verification fields
  professionalCredentials?: {
    degree: string;
    institution: string;
    graduationYear: string;
    certifications: Array<{
      name: string;
      issuer: string;
      issueDate: Date;
      documentUrl?: string;
    }>;
  };
  experienceProof?: {
    workCertificate?: string;
    linkedinUrl?: string;
    experienceYears: number;
    currentPosition?: string;
    company?: string;
    specialization: string[];
  };
  bankDetails?: {
    accountNumber: string;
    // India
    ifscCode?: string;
    // International
    routingNumber?: string; // US
    iban?: string; // EU/UK
    swiftCode?: string; // International
    bankName: string;
    accountHolderName: string;
    documentUrl?: string;
    country: CountryCode;
  };
  
  // Employer verification fields
  companyInfo?: {
    companyName: string;
    industry: string;
    authorizedRepresentative: {
      name: string;
      designation: string;
      email: string; // Must match company domain
    };
    phoneNumber: string;
    companyEmail: string; // Official company email
    website?: string;
    linkedinCompanyPage?: string;
  };
  companyKYC?: {
    registrationNumber: string;
    registrationDocumentUrl?: string;
    // India
    gstNumber?: string;
    panNumber?: string;
    cinNumber?: string;
    // US
    einNumber?: string;
    stateRegistration?: string;
    // EU/UK
    vatNumber?: string;
    companiesHouseNumber?: string;
    // Others
    businessRegistrationNumber?: string;
    tradeLicenseNumber?: string;
    country: CountryCode;
    documentType: BusinessDocumentType;
  };
  
  // Investor verification fields
  investorInfo?: {
    investmentPreferences: string[];
    trackRecord?: string;
    portfolioCompanies?: string[];
    investmentAmountRange?: {
      min: number;
      max: number;
      currency: string;
    };
  };
  taxCompliance?: {
    // India
    panNumber?: string;
    // US
    w9FormUrl?: string;
    w8benFormUrl?: string;
    // EU/Others
    tinNumber?: string;
    vatNumber?: string;
    country: CountryCode;
  };
  investmentBankDetails?: {
    accountNumber: string;
    routingNumber?: string;
    iban?: string;
    swiftCode?: string;
    bankName: string;
    accountHolderName: string;
    country: CountryCode;
  };
  
  // Sponsor/CSR verification fields
  sponsorInfo?: {
    organizationName: string;
    representativeName: string;
    designation: string;
    organizationEmail: string;
    phoneNumber: string;
    csrReportsUrl?: string;
    websiteUrl?: string;
  };
  sponsorKYC?: {
    registrationNumber: string;
    registrationDocumentUrl?: string;
    gstNumber?: string;
    panNumber?: string;
    country: CountryCode;
  };
  
  // Video verification (for L3)
  videoVerification?: {
    videoUrl?: string;
    verifiedAt?: Date;
    verifiedBy?: mongoose.Types.ObjectId;
  };
  
  // Address proof (for L3)
  addressProof?: {
    type: 'utility_bill' | 'bank_statement' | 'government_letter' | 'other';
    documentUrl?: string;
    address: string;
    country: CountryCode;
  };
  
  // Admin fields
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionReason?: string;
  adminNotes?: string;
  
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VerificationSchema = new Schema<IVerification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['student', 'mentor', 'employer', 'investor', 'sponsor', 'entrepreneur', 'admin'],
      required: true,
      index: true,
    },
    verificationLevel: {
      type: Number,
      enum: [0, 1, 2, 3],
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'incomplete'],
      default: 'incomplete',
      index: true,
    },
    
    // Global fields
    country: {
      type: String,
      enum: ['IN', 'US', 'GB', 'CA', 'AU', 'SG', 'AE', 'EU', 'OTHER'],
      required: true,
      default: 'IN',
    },
    phoneNumber: String,
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    
    // Student fields
    personalInfo: {
      fullName: String,
      dateOfBirth: Date,
      gender: {
        type: String,
        enum: ['male', 'female', 'other'],
      },
      nationality: String,
    },
    idProof: {
      type: {
        type: String,
        enum: ['aadhaar', 'pan', 'passport', 'driving_license', 'voter_id', 'ssn', 'us_passport', 'us_driving_license', 'eu_passport', 'eu_national_id', 'uk_passport', 'national_id', 'student_id', 'other'],
      },
      number: String,
      documentUrl: String,
      expiryDate: Date,
      country: {
        type: String,
        enum: ['IN', 'US', 'GB', 'CA', 'AU', 'SG', 'AE', 'EU', 'OTHER'],
      },
    },
    educationInfo: {
      institution: String,
      course: String,
      year: String,
      studentId: String,
      transcriptUrl: String,
      qualification: String,
    },
    profilePicture: String,
    additionalDocuments: [{
      name: String,
      url: String,
      type: String,
    }],
    
    // Mentor fields
    professionalCredentials: {
      degree: String,
      institution: String,
      graduationYear: String,
      certifications: [{
        name: String,
        issuer: String,
        issueDate: Date,
        documentUrl: String,
      }],
    },
    experienceProof: {
      workCertificate: String,
      linkedinUrl: String,
      experienceYears: Number,
      currentPosition: String,
      company: String,
      specialization: [String],
    },
    bankDetails: {
      accountNumber: String,
      ifscCode: String, // India
      routingNumber: String, // US
      iban: String, // EU/UK
      swiftCode: String, // International
      bankName: String,
      accountHolderName: String,
      documentUrl: String,
      country: {
        type: String,
        enum: ['IN', 'US', 'GB', 'CA', 'AU', 'SG', 'AE', 'EU', 'OTHER'],
      },
    },
    socialProfiles: {
      linkedin: String,
      github: String,
      portfolio: String,
    },
    
    // Employer fields
    companyInfo: {
      companyName: String,
      industry: String,
      authorizedRepresentative: {
        name: String,
        designation: String,
        email: String,
      },
      phoneNumber: String,
      companyEmail: String,
      website: String,
      linkedinCompanyPage: String,
    },
    companyKYC: {
      registrationNumber: String,
      registrationDocumentUrl: String,
      gstNumber: String, // India
      panNumber: String, // India
      cinNumber: String, // India
      einNumber: String, // US
      stateRegistration: String, // US
      vatNumber: String, // EU/UK
      companiesHouseNumber: String, // UK
      businessRegistrationNumber: String, // Others
      tradeLicenseNumber: String, // Others
      country: {
        type: String,
        enum: ['IN', 'US', 'GB', 'CA', 'AU', 'SG', 'AE', 'EU', 'OTHER'],
      },
      documentType: {
        type: String,
        enum: ['gst', 'cin', 'pan_business', 'ein', 'vat', 'companies_house', 'business_registration', 'trade_license', 'other'],
      },
    },
    
    // Investor fields
    investorInfo: {
      investmentPreferences: [String],
      trackRecord: String,
      portfolioCompanies: [String],
      investmentAmountRange: {
        min: Number,
        max: Number,
        currency: String,
      },
    },
    taxCompliance: {
      panNumber: String, // India
      w9FormUrl: String, // US
      w8benFormUrl: String, // US
      tinNumber: String, // EU/Others
      vatNumber: String, // EU/Others
      country: {
        type: String,
        enum: ['IN', 'US', 'GB', 'CA', 'AU', 'SG', 'AE', 'EU', 'OTHER'],
      },
    },
    investmentBankDetails: {
      accountNumber: String,
      routingNumber: String,
      iban: String,
      swiftCode: String,
      bankName: String,
      accountHolderName: String,
      country: {
        type: String,
        enum: ['IN', 'US', 'GB', 'CA', 'AU', 'SG', 'AE', 'EU', 'OTHER'],
      },
    },
    
    // Sponsor fields
    sponsorInfo: {
      organizationName: String,
      representativeName: String,
      designation: String,
      organizationEmail: String,
      phoneNumber: String,
      csrReportsUrl: String,
      websiteUrl: String,
    },
    sponsorKYC: {
      registrationNumber: String,
      registrationDocumentUrl: String,
      gstNumber: String,
      panNumber: String,
      country: {
        type: String,
        enum: ['IN', 'US', 'GB', 'CA', 'AU', 'SG', 'AE', 'EU', 'OTHER'],
      },
    },
    
    // L3 Premium fields
    videoVerification: {
      videoUrl: String,
      verifiedAt: Date,
      verifiedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    },
    addressProof: {
      type: {
        type: String,
        enum: ['utility_bill', 'bank_statement', 'government_letter', 'other'],
      },
      documentUrl: String,
      address: String,
      country: {
        type: String,
        enum: ['IN', 'US', 'GB', 'CA', 'AU', 'SG', 'AE', 'EU', 'OTHER'],
      },
    },
    
    // Admin fields
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    rejectionReason: String,
    adminNotes: String,
    
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
VerificationSchema.index({ userId: 1, role: 1 });
VerificationSchema.index({ status: 1, role: 1 });

// Prevent duplicate verifications per user-role
VerificationSchema.index({ userId: 1, role: 1 }, { unique: true });

const Verification = mongoose.model<IVerification>('Verification', VerificationSchema);

export default Verification;

