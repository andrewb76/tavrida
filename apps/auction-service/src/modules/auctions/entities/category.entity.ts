import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Auction } from './auction.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  slug: string; // url-friendly имя, например "tsarskaya-rossiya" для фронтенда

  // Ссылка на родительскую категорию (если null — это корневая категория, например "Монеты")
  @ManyToOne(() => Category, (category) => category.children, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: Category;

  // Список дочерних подкатегорий
  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  // Все аукционы, привязанные к этой конкретной ветке
  @OneToMany(() => Auction, (auction) => auction.category)
  auctions: Auction[];
}
