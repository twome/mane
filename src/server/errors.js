export class SpecialCommentMissing extends Error{
	constructor(){
		super('Expected a special comment in this format: /* patch-urls <comma-separated list of domain regexes> */')
	}
}