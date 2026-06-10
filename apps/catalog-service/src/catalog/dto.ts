import { PAGE_SIZES, PRODUCT_SORTS } from "@marketplace/contracts";
import type { PageSize, ProductSort } from "@marketplace/contracts";
import { Transform, Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

export class ProductListQueryDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(PRODUCT_SORTS)
  sort: ProductSort = "relevance";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsIn(PAGE_SIZES)
  pageSize: PageSize = 20;
}

export class CreateProductDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  name!: string;

  @IsString()
  @MinLength(20)
  @MaxLength(3000)
  description!: string;

  @IsString()
  categoryId!: string;

  @IsInt()
  @Min(1)
  @Max(100_000_000)
  priceMinor!: number;

  @IsString()
  imageUrl!: string;

  @IsInt()
  @Min(0)
  @Max(1_000_000)
  stock!: number;
}

export class SaveCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  parentId!: string | null;
}
