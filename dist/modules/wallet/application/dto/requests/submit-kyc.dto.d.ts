export declare class AddressDto {
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
}
export declare class SubmitKycDto {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    country: string;
    idType: 'passport' | 'national_id' | 'drivers_license';
    idNumber: string;
    idExpiryDate?: string;
    address?: AddressDto;
    documentFrontKey?: string;
    documentBackKey?: string;
    selfieKey?: string;
}
