import { MaybeRefOrGetter } from "@vueuse/core";
import { useIDBKeyval, UseIDBOptions } from "@vueuse/integrations/useIDBKeyval";
import { onMounted, ref, Ref, watch } from "vue";

export async function useIDBKeyvalAsync<T>(
	key: IDBValidKey,
	initialValue: MaybeRefOrGetter<T>,
	options?: UseIDBOptions,
): Promise<Ref<T>> {
	const idbKeyval = useIDBKeyval<T>(key, initialValue, options);

	if (!idbKeyval.isFinished) {
		await new Promise<void>((resolve) => {
			const unwatch = watch(idbKeyval.isFinished, (isFinished) => {
				if (isFinished) {
					unwatch();
					resolve();
				}
			});
		});
	}

	return idbKeyval.data;
}

let uniqueId = 0;
const uniqueIds = new WeakMap<WeakKey, number>();
export function getUniqueObjectId(object: WeakKey): number {
	let id = uniqueIds.get(object);
	if (!id) {
		id = uniqueId++;
		uniqueIds.set(object, id);
	}
	return id;
}

export function usePresentingElement(): Ref<HTMLElement | undefined> {
	const presentingElement = ref();

	onMounted(() => {
		presentingElement.value = document.querySelector("ion-router-outlet");
	});

	return presentingElement;
}
