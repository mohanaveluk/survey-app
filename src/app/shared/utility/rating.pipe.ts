// rating-format.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'ratingFormat'
})
export class RatingFormatPipe implements PipeTransform {
  transform(value: number): string {
    // Removes trailing .0 if present, otherwise keeps one decimal
    return value % 1 === 0 ? value.toString() : value.toFixed(1).replace(/\.?0+$/, '');
  }
}