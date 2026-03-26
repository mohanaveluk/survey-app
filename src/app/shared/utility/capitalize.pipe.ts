// capitalize.pipe.ts (advanced)
import { Pipe, PipeTransform } from '@angular/core';

type CapitalizeOption = 'first' | 'all' | 'first-of-each';

@Pipe({
  name: 'capitalize'
})
export class CapitalizePipe implements PipeTransform {
  transform(value: string, option: CapitalizeOption = 'first-of-each'): string {
    if (!value) return '';
    
    switch (option) {
      case 'first':
        // Capitalize only first character of the entire string
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
        
      case 'all':
        // Capitalize all characters
        return value.toUpperCase();
        
      case 'first-of-each':
      default:
        // Capitalize first letter of each word
        return value.split(' ').map(word => {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
    }
  }
}

/*
{{ 'hello world' | capitalize:'first' }}
<!-- Output: "Hello world" -->

{{ 'hello world' | capitalize:'all' }}
<!-- Output: "HELLO WORLD" -->

{{ 'hello world' | capitalize:'first-of-each' }}
<!-- Output: "Hello World" -->

{{ 'hello world' | capitalize }}
<!-- Output: "Hello World" (default) -->

 */