import { Module } from '@nestjs/common'
import { CategoriesModule } from './categories/categories.module'
import { BaseShoesModule } from './base-shoes/base-shoes.module'
import { HeelStylesModule } from './heel-styles/heel-styles.module'
import { CompatibilityModule } from './compatibility/compatibility.module'
import { VariantsModule } from './variants/variants.module'

@Module({
  imports: [CategoriesModule, BaseShoesModule, HeelStylesModule, CompatibilityModule, VariantsModule],
})
export class CatalogModule {}
