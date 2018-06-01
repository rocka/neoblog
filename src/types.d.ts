namespace Model {
    interface FileMeta {
        path: string;
        base: string;
        ext: string;
    }

    interface ArticleMeta {
        title: string;
        date: Date;
        tags: string[];
    }

    interface Article {
        meta: ArticleMeta;
        file: FileMeta;
        src: string;
        html: string;
        excerpt: string;
        excerptText: string;
        excerptImg: string;
        more: boolean;
    }
}
