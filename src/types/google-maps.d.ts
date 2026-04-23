// Minimal type shim for the Google Maps Places Autocomplete API.
// Replace with @types/google.maps if you need full typings.
declare namespace google {
  namespace maps {
    namespace places {
      class Autocomplete {
        constructor(
          inputField: HTMLInputElement,
          opts?: {
            componentRestrictions?: { country: string | string[] };
            fields?: string[];
            types?: string[];
          }
        );
        getPlace(): {
          address_components?: Array<{
            long_name: string;
            short_name: string;
            types: string[];
          }>;
        };
        addListener(event: string, handler: () => void): void;
      }
    }
    namespace event {
      function clearInstanceListeners(instance: object): void;
    }
  }
}
