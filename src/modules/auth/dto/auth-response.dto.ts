export class AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    isPrimaryAdmin: boolean;
    role: {
      code: string;
      name: string;
    } | null;
  };
  company: {
    id: string;
    name: string;
  };
  permissions: string[];
}
