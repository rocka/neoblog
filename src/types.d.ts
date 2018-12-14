declare namespace Model {

    export interface ArticleFile {
        path: string;
        base: string;
        ext: string;
    }

    export interface ArticleMeta {
        title: string;
        date: Date;
        tags: string[];
        excerpt?: string;
        img?: string;
    }

    export interface Article {
        meta: ArticleMeta;
        file: ArticleFile;
        src: string;
        html: string;
        excerpt: string;
        excerptText: string;
        excerptImg: string;
        more: boolean;
    }

}

export = Model;
export as namespace Model;
