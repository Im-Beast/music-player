<script lang="ts" setup>
import { InputCustomEvent, IonInput, IonItem, IonNote } from "@ionic/vue";
import { computed, onMounted, reactive, ref, useTemplateRef } from "vue";

const {
	value = [],
	label,
	formatter,
} = defineProps<{
	value?: string[];
	label?: string;
	formatter?: (values: string[]) => string;
}>();

const values = reactive([...value]);

const emit = defineEmits<{
	change: [string[]];
}>();

const formattedValues = computed(() => {
	const toFormat = markedValue.value ? [...values, ""] : values;
	return formatter ? formatter(toFormat) : toFormat.join(",");
});

const input = useTemplateRef("input");
const left = ref(0);
onMounted(() => {
	const inputElement = input.value?.$el as HTMLElement;
	if (!inputElement) return;
	setTimeout(() => {
		const content = inputElement.querySelector(".native-wrapper");
		if (!content) return;

		left.value = content.getBoundingClientRect().left - inputElement.getBoundingClientRect().left;
	}, 32);
});

const markedValue = ref<string>();
function handleValueAddition(event: InputCustomEvent): void {
	if (markedValue.value) {
		values.push(markedValue.value);
		markedValue.value = undefined;
	}

	const inputValue = (event.target.value ?? "") as string;

	if (inputValue.endsWith(",")) {
		const value = inputValue.slice(0, -1);
		if (value) {
			values.push(value);
			emit("change", [...values]);
		}
		event.target.value = "";
	}
}
function handleValueRemoval(event: InputCustomEvent): void {
	if (event.target.value) return;

	if (markedValue.value) {
		markedValue.value = undefined;
		emit("change", [...values]);
	} else {
		markedValue.value = values.pop();
	}
}
</script>

<template>
	<ion-item ref="input" class="multi-value-input" lines="none">
		<ion-input
			:label
			:placeholder="label"
			@ion-input="handleValueAddition"
			@keydown.backspace="handleValueRemoval"
		/>
	</ion-item>
	<Transition name="pop-in">
		<ion-item
			class="preview"
			:aria-label="`${label} Preview`"
			:style="{ '--label-padding-left': `${left}px` }"
		>
			<div class="preview-container">
				<ion-note color="dark" v-if="values.length || !markedValue">
					{{ formattedValues }}
				</ion-note>
				<ion-note class="marked-value" color="danger" v-if="markedValue">
					{{ markedValue }}
				</ion-note>
			</div>
		</ion-item>
	</Transition>
</template>

<style scoped>
ion-item {
	&.preview {
		--min-height: 0;
		max-height: 44px;
	}

	& > .preview-container {
		display: flex;
		width: 100%;

		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		padding-bottom: 12px;
		padding-left: calc(var(--label-padding-left) - 16px);

		& > ion-note {
			font-weight: normal;
			font-size: 1rem;

			&.marked-value {
				font-weight: bold;

				&:not(first-child) {
					margin-left: 0.4ch;
				}
			}
		}
	}
}
</style>
