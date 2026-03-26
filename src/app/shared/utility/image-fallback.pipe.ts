import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'imageFallback'
})
export class ImageFallbackPipe implements PipeTransform {
  transform(value: string | null, fallback: string): string {
    return value || fallback;
  }
}