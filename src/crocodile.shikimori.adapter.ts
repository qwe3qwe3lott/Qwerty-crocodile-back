import { Answer, AnswerAdapter } from './crocodile.entity';
import { ENV_CONFIG } from './crocodile.consts';
import { cacheExchange, Client, fetchExchange } from '@urql/core';
import { getRandomArrayElement } from './app.util';

const animesQuery = `
	query($limit: Int, $order: OrderEnum) {
		animes(limit: $limit, order: $order) {
			id
			name
			russian
			poster { originalUrl }
		}
	}
`;

const client = new Client({
	url: ENV_CONFIG.SHIKIMORI_GQL_BACKEND_API_URL,
	exchanges: [ cacheExchange, fetchExchange ],
});

export class ShikimoriAnswerAdapter implements AnswerAdapter {
	private static instance: ShikimoriAnswerAdapter;

	constructor() {
		if (!ShikimoriAnswerAdapter.instance) {
			ShikimoriAnswerAdapter.instance = this;
		}

		return ShikimoriAnswerAdapter.instance;
	}

	async fetchAnswer(): Promise<Answer | null> {
		try {
			const result = await client.query<{
				animes: Array<{
					id: string;
					name: string;
					russian: string;
					poster: { originalUrl: string };
				}>
			}>(animesQuery, {
				limit: 50,
				order: 'popularity',
			}).toPromise();

			const anime = result.data ? getRandomArrayElement(result.data.animes) : null;

			if (!anime) return null;

			return {
				label: [ anime.name, anime.russian ].filter(Boolean).join(' | '),
				value: anime.id,
				posterUrl: anime.poster.originalUrl,
			};
		} catch (e) {
			console.error(e);
			return null;
		}
	}
}
